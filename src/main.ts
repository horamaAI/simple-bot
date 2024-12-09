import { BskyAgent, AppBskyGraphDefs } from '@atproto/api';
import * as dotenv from 'dotenv';
//import { CronJob } from 'cron';
import * as process from 'process';

dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  });
const abablipListUri = process.env.BLUESKY_ABABLIP_LIST_URI!;
const abablipUsername = process.env.BLUESKY_USERNAME!;

function isFollowerReallyUmublip(umublipToCheck: any) {
  return umublipToCheck!.description!.toLowerCase().includes("umublip");
}

async function getAbablipFilteredFollowers() {
  let { data: { followers } } = await agent.app.bsky.graph.getFollowers({actor: abablipUsername!});
  return followers.filter(isFollowerReallyUmublip);
}

async function getAbablipListMembers() {
  let members: AppBskyGraphDefs.ListItemView[] = [];
  let cursor: string | undefined;
  do {
    let res = await agent.app.bsky.graph.getList({
      list: abablipListUri,
      limit: 30,
      cursor
    });
    cursor = res.data.cursor;
    members = members.concat(res.data.items);
  } while (cursor)
  return members;
}

// show data when required, maybe most appropriate to activate when
// in debug mode ?
async function showData(abablipFollowers: Promise<any>, abablipListMembers: Promise<any>) {
  abablipFollowers.then((follower)=>{
    console.log("show umublip wa vrai: ", follower);
  });
  abablipListMembers.then((members)=>{
    console.log("show the abablip list member (should be a true umublip and have/had \"umublip\" in his description): ", members);
  });
}

//async function addMissingAbablips() {
//
//}

async function getUnreadFollowNotifications() {
  let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  return notifications!.filter((notification)=> !notification!.isRead && notification!.reason === "follow");
}

async function testApiEntry() {
  let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  console.log("check content: ", notifications);
}

async function addFollowerToAbablipList(followerDid: string) {
  await agent.com.atproto.repo.createRecord({
    repo: process.env.BLUESKY_USERNAME!,
    collection: 'app.bsky.graph.listitem',
    record: {
      $type: 'app.bsky.graph.listitem',
      subject: followerDid,
      list: abablipListUri,
      createdAt: new Date().toISOString()
    }
  });
  //console.log("check content: ", notifications);
}

async function main() {
  await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD!});
  let abablipFollowers = getAbablipFilteredFollowers();
  let abablipListMembers = getAbablipListMembers();
  //await agent.post({
  //    text: "🇧🇮"
  //    text: "🙂"
  //
  //});
  console.log("Just posted!");
  showData(abablipFollowers, abablipListMembers);
  let unreadFollowNotifications = getUnreadFollowNotifications();
  unreadFollowNotifications.then((content)=> console.log("another ugly console log: ", content));
  unreadFollowNotifications.then((notifications) => notifications.forEach((newFollower) => addFollowerToAbablipList(newFollower!.author!.did!)));
  testApiEntry();
  let wth = await agent.app.bsky.graph.getLists({actor: process.env.BLUESKY_USERNAME!, limit: 30});
  console.log("as usual, very ugly:", wth.data);
}

main();


// Run this on a cron job
//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
//const scheduleExpressionFifteenMinute = '*/15 * * * *'; // Run once every 15 minutes
//const scheduleExpression = '0 */3 * * *'; // Run once every three hours in prod

//const job = new CronJob(scheduleExpressionMinute, main); // change to scheduleExpressionMinute for testing
//const job = new CronJob(scheduleExpression, main); // change to scheduleExpressionMinute for testing

//job.start();

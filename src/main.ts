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
async function showPromiseData(msg: string, promiseData: Promise<any>) {
  promiseData.then((content)=>{
    console.log(msg, "show data content:", content);
    //console.log(msg, " show data content size: ", content.length);
  });
}

function markNotificationsAsSeen() {
 let nowDateTime: Date = new Date(Date.now())
 console.log("notifications marked as all seen at:", nowDateTime)
 agent.app.bsky.notification.updateSeen({
   seenAt: nowDateTime.toISOString()
 });
}

async function getUnreadFollowNotifications() {
  let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  return notifications!.filter((notification)=> !notification!.isRead && notification!.reason === "follow");
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
}

async function removeRecord(rkeyToDelete: string) {
  await agent.com.atproto.repo.deleteRecord({
    repo: process.env.BLUESKY_USERNAME!,
    collection: 'app.bsky.graph.listitem',
    rkey: rkeyToDelete
  });
}

async function addNewAbablipsFollowersToAbablipsList() {
  let unreadFollowNotifications = getUnreadFollowNotifications();
  unreadFollowNotifications.then((notifications) => {
    notifications.forEach((newFollowNotification) => {
      let newFollower = newFollowNotification!.author!;
      if(isFollowerReallyUmublip(newFollower)){
        addFollowerToAbablipList(newFollower.did);
        console.log("added to abablip list new follower: ", newFollower.handle);
      }
    });
    // if had unread, then mark them as read
    if (notifications.length > 0) {
      markNotificationsAsSeen();
    }
  });
}

async function testApiEntry() {
  //let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  //console.log("check content: ", notifications);
  const {repo, collection, rkey} = new AtUri(abablipListUri)
  console.log(repo, collection, rkey);
   console.log("check 12, 21");
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
  showPromiseData("show just abablip followers:", abablipFollowers);
  showPromiseData("show list members:", abablipListMembers);
  addNewAbablipsFollowersToAbablipsList();
  testApiEntry();
}

main();

// Run this on a cron job
//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
//const scheduleExpressionFifteenMinute = '*/15 * * * *'; // Run once every 15 minutes
//const scheduleExpression = '0 */3 * * *'; // Run once every three hours in prod

//const job = new CronJob(scheduleExpressionMinute, main); // change to scheduleExpressionMinute for testing
//const job = new CronJob(scheduleExpression, main); // change to scheduleExpressionMinute for testing

//job.start();

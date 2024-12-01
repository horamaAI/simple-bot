import { BskyAgent, AppBskyGraphDefs } from '@atproto/api';
import * as dotenv from 'dotenv';
//import { CronJob } from 'cron';
import * as process from 'process';

dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  });

function isFollowerReallyUmublip(umublipToCheck: any) {
  return umublipToCheck!.description!.toLowerCase().includes("umublip");
}

async function getAbablipFilteredFollowers() {
  let { data: { followers } } = await agent.app.bsky.graph.getFollowers({actor: process.env.BLUESKY_USERNAME!});
  return followers.filter(isFollowerReallyUmublip);
}

async function getAbablipListMembers() {
  let uri = process.env.BLUESKY_ABABLIP_LIST_DID!;
  let members: AppBskyGraphDefs.ListItemView[] = [];
  let cursor: string | undefined;
  do {
    let res = await agent.app.bsky.graph.getList({
      list: uri,
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

async function testApiEntry() {
  let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  console.log("check content: ", notifications);
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

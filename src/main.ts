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
  abablipFollowers.then((follower)=>{
    console.log("show umublip wa vrai: ", follower);
  });
  abablipListMembers.then((members)=>{
    // validate that member is really a blip
    // really necessary ? since prerequisite of being a member is to be umublip
    for (const member of members) {
      if (member?.subject?.description?.toLowerCase().includes("umublip")) {
        console.log("yes, a umublip");
      }
    }
    console.log("show the abablip list member: ", members);
  });
}

main();


// Run this on a cron job
//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
//const scheduleExpressionFifteenMinute = '*/15 * * * *'; // Run once every 15 minutes
//const scheduleExpression = '0 */3 * * *'; // Run once every three hours in prod

//const job = new CronJob(scheduleExpressionMinute, main); // change to scheduleExpressionMinute for testing
//const job = new CronJob(scheduleExpression, main); // change to scheduleExpressionMinute for testing

//job.start();

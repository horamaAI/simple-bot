import { BskyAgent, AppBskyGraphDefs } from '@atproto/api';
import * as dotenv from 'dotenv';
//import { CronJob } from 'cron';
import * as process from 'process';

dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  });

//static getAbablipFollowers {
async function getAbablipFollowers() {
  //const { uri } = 'at://did:plc:plveesmuzs3rizet3tfc5b56/app.bsky.graph.list/3lbpju5w4il25'
  let uri = 'at://did:plc:plveesmuzs3rizet3tfc5b56/app.bsky.graph.list/3lbpju5w4il25';
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
  // let abablips = getAbablipFollowers();
  let abatest = getAbablipFollowers();
  //await agent.post({
  //    text: "🙂"
  //});
  console.log("Just posted!");
  //console.log("show abablip!", abablips);
  abatest.then((followers)=>{
    for (const follower of followers) {
      if (follower?.subject?.description?.toLowerCase().includes("umublip")) {
        console.log("yes, a umublip")
      }
    }
    console.log("show content ", followers)
  });
  //console.log("show abablip!", abatest.then()items);
}

main();


// Run this on a cron job
//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
//const scheduleExpressionFifteenMinute = '*/15 * * * *'; // Run once every 15 minutes
//const scheduleExpression = '0 */3 * * *'; // Run once every three hours in prod

//const job = new CronJob(scheduleExpressionMinute, main); // change to scheduleExpressionMinute for testing
//const job = new CronJob(scheduleExpression, main); // change to scheduleExpressionMinute for testing

//job.start();

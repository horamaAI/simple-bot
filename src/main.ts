import { BskyAgent, AppBskyGraphDefs } from '@atproto/api';
import { AtUri } from '@atproto/syntax';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as process from 'process';

dotenv.config();

const ABABLIP_HANDLE = process.env.MY_BLUESKY_HANDLE!;
const ABABLIP_DID = process.env.MY_BLUESKY_DID!;
const ABABLIP_LIST_URI = process.env.MY_BLUESKY_ABABLIP_LIST_URI!;
const ABABLIP_PSWD = process.env.MY_BLUESKY_PASSWORD!;

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social'
});

function isFollowerReallyUmublip(umublipToCheck: any) {
  return umublipToCheck!.description!.toLowerCase().includes("umublip");
}

//******
// section: cleanup/remove abablip members that stopped following the feed
//******

async function getAbablipFilteredFollowers() {
  let { data: { followers } } = await agent.app.bsky.graph.getFollowers({actor: ABABLIP_HANDLE});
  return followers.filter(isFollowerReallyUmublip);
}

async function getAbablipListMembers() {
  let members: AppBskyGraphDefs.ListItemView[] = [];
  let cursor: string | undefined;
  do {
    let res = await agent.app.bsky.graph.getList({
      list: ABABLIP_LIST_URI,
      limit: 30,
      cursor
    });
    cursor = res.data.cursor;
    members = members.concat(res.data.items);
  } while (cursor)
  return members;
}

function isMembersRecordSubjectStillFollowingFeed(subjectDid: string, abablipFollowers: any) {
  return abablipFollowers.some((follower: any) => follower.did === subjectDid);
}

function getAbablipLeaving(abablipFollowers: any, abablipList: any) {
  return abablipList
    // first remove myself, don't wan't to leave
    .filter((listRecord: any) => listRecord!.subject!.did! !== ABABLIP_DID)
    .filter((listRecord: any) => !isMembersRecordSubjectStillFollowingFeed(listRecord!.subject!.did!, abablipFollowers));
}

async function removeRecord(rkeyToDelete: string) {
  await agent.com.atproto.repo.deleteRecord({
    repo: ABABLIP_HANDLE,
    collection: 'app.bsky.graph.listitem',
    rkey: rkeyToDelete
  });
}

function cleanUpTheseQuittersFromAbablipList(quitters: Array<string>) {
  console.log("quitters records URIs:", quitters);
  quitters.forEach(async (quitterUri: any) => removeRecord(new AtUri(quitterUri).rkey));
}

//******
// section: add new followers to feed
//******

function markNotificationsAsSeen(nowDateTime: Date) {
 agent.app.bsky.notification.updateSeen({
   seenAt: nowDateTime.toISOString()
 });
 console.log(nowDateTime, ": notifications marked as all seen.");
}

async function getUnreadFollowNotifications() {
  let { data: { notifications } } = await agent.app.bsky.notification.listNotifications();
  return notifications!.filter((notification) => !notification!.isRead && notification!.reason === "follow");
}

async function addFollowerToAbablipList(followerDid: string) {
  await agent.com.atproto.repo.createRecord({
    repo: ABABLIP_HANDLE,
    collection: 'app.bsky.graph.listitem',
    record: {
      $type: 'app.bsky.graph.listitem',
      subject: followerDid,
      list: ABABLIP_LIST_URI,
      createdAt: new Date().toISOString()
    }
  });
}

//******
// section: utils, and, frankly, trash...
//******

//async function testApiEntry() {
  //let { data: { records } } = await agent.com.atproto.repo.listRecords({
  //  repo: ABABLIP_HANDLE,
  //  collection: 'app.bsky.graph.listitem'
  //});
  //console.log("check 12, 21");
//}

// show data when needs debugging
// maybe more appropriate to use solution active in debug mode ?
//async function showPromiseData(msg: string, promiseData: Promise<any>) {
function showPromiseData(msg: string, someData: any) {
  //console.log(msg, "show data content:", someData);
  console.log(msg, "show data content count:", someData.length);
}

//******
// section: main processes and their jobs
//******

//async function main() {
//  await agent.login({ identifier: ABABLIP_HANDLE, password: ABABLIP_PSWD });
//  await agent.post({
//      text: "🇧🇮"
//      //text: "🙂"
//  });
//  console.log("Just posted!");
//  //testApiEntry();
//}
//main();

async function doAddNewFollowersToFeedWhenApplicable() {
  await agent.login({ identifier: ABABLIP_HANDLE, password: ABABLIP_PSWD });
  let unreadFollowNotifications = getUnreadFollowNotifications();
  unreadFollowNotifications.then((notifications) => {
    let count = 0;
    let nowDateTime: Date = new Date(Date.now());
    notifications.forEach((newFollowNotification) => {
      let newFollower = newFollowNotification!.author!;
      if(isFollowerReallyUmublip(newFollower)){
        addFollowerToAbablipList(newFollower.did);
        console.log(nowDateTime, ": added to abablip list new follower:", newFollower.handle);
      }
      count++;
    });
    // mark all notifications as read
    if (notifications.length > 0 && notifications.length === count) {
      markNotificationsAsSeen(nowDateTime);
    }
  });
}

async function doListCleanUp() {
  await agent.login({ identifier: ABABLIP_HANDLE, password: ABABLIP_PSWD });
  let abablipFollowers = await getAbablipFilteredFollowers();
  let abablipListMembers = await getAbablipListMembers();
  showPromiseData("checkout followers data", abablipFollowers);
  showPromiseData("checkout list members data", abablipListMembers);
  let quitters = getAbablipLeaving(abablipFollowers, abablipListMembers);
  if (quitters.length > 0) {
    cleanUpTheseQuittersFromAbablipList(quitters.map((listRecord: any) =>
      listRecord!.uri!));
  }
  else {
    console.log("cleanup not performed, not needed, all clear.");
  }
}

//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
const scheduleExpressionFifteenMinute = '*/15 * * * *'; // Run every 15 minutes
const scheduleExpressionTwicePerDay = '0 3,15 * * *'; // Run twice: 03AM, and 15PM

//const job = new CronJob(scheduleExpressionMinute, main); // change to scheduleExpressionMinute for testing
const jobScanNewFollowers = new CronJob(scheduleExpressionFifteenMinute, doAddNewFollowersToFeedWhenApplicable);
const jobDoCleanUps = new CronJob(scheduleExpressionTwicePerDay, doListCleanUp);

jobScanNewFollowers.start();
jobDoCleanUps.start();
//job.start();

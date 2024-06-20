import { Kafka, Partitioners } from "kafkajs";
// import { storeMessage } from "../../app";

import { Portal } from '../models/portal.model.js';

export async function storeBatchMessages(batch) {
  if(!batch || batch.length === 0) return;
  //   console.log(batch);
  const bulkOps = batch.map(({ message, qId, UID }) => ({
    updateOne: {
      filter: { UID, "portals.querierId": qId },
      update: { $push: { "portals.$.messages": message } },
    },
  }));
  try{
    const result = await Portal.bulkWrite(bulkOps, { ordered: false });
    console.log("Message stored successfully.");
    // res.json({saved:"true"});
  }catch(err) {
    console.log(err);
    // res.json({saved:"false"});
  }
}

const kafka = new Kafka({
  clientId: "my-app",
  brokers: ["192.168.119.130:9092"], // Adjust based on your Kafka Docker setup
  // brokers: ["kafka:9092"], // Adjust based on your Kafka Docker setup
  // ssl: {
  //   ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")],
  // },
  // sasl: {
  //   username: "",
  //   password: "",
  //   mechanism: "",
  // },
});

let producer = null;
let consumer = null;

export async function createProducer() {
  if (producer) return producer;

  const _producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner // Use LegacyPartitioner from Partitioners
  });
  await _producer.connect();
  producer = _producer;
  return producer;
}

export async function produceMessage(message, qId, UID) {
  const producer = await createProducer();
  // console.log(message,qId,UID)
  await producer.send({
    topic: "MESSAGES",
    messages: [{
      partition: 0,
      key: "message",
      value: JSON.stringify({ message, qId, UID }),
    }],
  });
  return true;
}

export async function startMessageConsumer() {
  console.log("Consumer is running..");
  consumer = kafka.consumer({ groupId: "default" });

  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });

  await consumer.run({
    autoCommit: true,
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
      if (!batch.messages.length) return;
      const parsedBatch = [];
      for (const msg of batch.messages) {
        if (!msg.value) continue;
        try{
          const data = JSON.parse(msg.value.toString());
          parsedBatch.push(data);
          resolveOffset(msg.offset);
        }catch (err) {
          console.error(err.message);
        }
      }
      if (parsedBatch.length > 0) {
        await storeBatchMessages(parsedBatch);
      }
    },
  });
}

// Function to create topics
export async function createTopics() {
  const admin = kafka.admin();
  await admin.connect();

  // Create topics as needed
  await admin.createTopics({
    topics: [{ topic: "MESSAGES" }],
  });

  await admin.disconnect();
}

export async function initialize() {
  await createTopics();
  await startMessageConsumer();
}
initialize();

export { kafka };
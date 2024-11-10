import { Kafka,Partitioners } from "kafkajs";
// import { storeMessage } from "../../app";

import { Portal } from '../models/portal.model.js';

export async function storeMessage(message,qId,UID){
    console.log(message,qId,UID);
    try{
        const portal = await Portal.findOne({UID});
        //   console.log(portal);
        const targetPortal = portal.portals.find(p => p.querierId === qId);
        if (targetPortal) {
            targetPortal.messages.push(message);
            await portal.save();
            console.log("Message stored successfully.");
        } else {
            console.log("Querier not found.");
        }
        // res.json({saved:"true"});

    }catch(err){
        console.log("gemini")
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
  producer =_producer;
  return producer;
}

export async function produceMessage( message, qId, UID ) {
  const producer = await createProducer();
  // console.log(message,qId,UID)
  await producer.send({
    topic: "MESSAGES",
    messages: [{
      partition:0,
      key: "message",
      value: JSON.stringify({ message, qId, UID }),
    }],  });
  return true;
}

export async function startMessageConsumer() {
  console.log("Consumer is running..");
  consumer = kafka.consumer({ groupId: "default" });

  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });

  await consumer.run({
    autoCommit: true,
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      console.log(`New Message Received: ${message.value.toString()}`);

      try {
        const { message: msg, qId, UID } = JSON.parse(message.value.toString());
        // console.log(message);
        await storeMessage(msg, qId, UID);

      } catch (err) {
        console.error("Error processing message:", err.message);
      }
    },
  });
}

// Function to create topics (you need to create topics manually in local Kafka)
export async function createTopics() {
  const admin = kafka.admin();
  await admin.connect();

  // Create topics as needed
  await admin.createTopics({
    topics: [{ topic: "MESSAGES" }],
  });

  await admin.disconnect();
}

// Ensure topics are created before starting the consumer
export async function initialize() {
  await createTopics(); // Create topics if not already created
  await startMessageConsumer(); // Start the message consumer
}
initialize();

export { kafka };
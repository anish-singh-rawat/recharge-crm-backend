import "../src/config/env.js";
import axios from "axios";
import https from "https";

const API_TOKEN = process.env.MROBOTICS_API_KEY;
const BASE_URL = "https://mrobotics.in";

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const ENDPOINTS = [
  "/api/plans",
  "/api/plan",
  "/api/planfetch",
  "/api/plan_fetch",
  "/api/plan/fetch",
  "/api/plans/fetch",
  "/api/plans/list",
  "/api/plan/list",
  "/api/browse_plans",
  "/api/browse-plans",
  "/api/recharge/plans",
  "/api/recharge/plan",
  "/api/recharge/planfetch",
  "/api/recharge/plans/fetch",
  "/api/operator/plans",
  "/api/operator_plan",
  "/api/operator_plans",
];

const PAYLOAD = {
  api_token: API_TOKEN,
  memberId: process.env.MROBOTICS_MEMBER_ID,
  operatorCode: "AIRTEL",
  circleCode: "UW",
  company_id: "2",
  operatorcode: "AIRTEL",
  circlecode: "UW",
  timestamp: Date.now().toString(),
};

function isHtml(data) {
  return (
    typeof data === "string" &&
    (
      data.includes("<html") ||
      data.includes("<!DOCTYPE") ||
      data.includes("404. That's an error")
    )
  );
}

async function testEndpoint(endpoint) {
  try {
    const response = await http.get(endpoint, {
      params: PAYLOAD,
      validateStatus: () => true,
    });

    const html = isHtml(response.data);

    console.log(
      `${response.status === 200 && !html ? "✅" : "❌"} ${
        response.status
      } ${endpoint}`
    );

    if (!html) {
      console.log(
        JSON.stringify(response.data, null, 2).slice(0, 3000)
      );

      console.log(
        "\n🔥 POSSIBLE WORKING ENDPOINT:",
        endpoint
      );

      return true;
    }

    return false;
  } catch (error) {
    console.log(
      `⚠️ ${endpoint} → ${error.code || error.message}`
    );

    return false;
  }
}

async function run() {
  console.log("\n==============================================");
  console.log(" MROBOTICS PLAN ENDPOINT DISCOVERY");
  console.log("==============================================");

  console.log("Base URL:", BASE_URL);
  console.log("Operator:", "AIRTEL");
  console.log("Circle  :", "UW");

  console.log("\n----------------------------------------------\n");

  for (const endpoint of ENDPOINTS) {
    const found = await testEndpoint(endpoint);

    if (found) {
      console.log("\n==============================================");
      console.log("✅ FOUND POSSIBLE PLAN ENDPOINT");
      console.log("==============================================");
      break;
    }
  }

  console.log("\n==============================================");
  console.log("DONE");
  console.log("==============================================\n");
}

run();
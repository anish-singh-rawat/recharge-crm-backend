import "../config/env.js";
import axios from "axios";
import https from "https";

const API_TOKEN = process.env.MROBOTICS_API_KEY;
const BASE_URL = "https://mrobotics.in";

const MOBILE = "9876867369";
const AMOUNT = "20";

const COMPANY_IDS = {
  Airtel: "2",
};

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

async function tryRecharge(companyId, label) {
  const payload = {
    api_token: API_TOKEN,
    mobile_no: MOBILE,
    amount: AMOUNT,
    company_id: companyId,
    order_id: `TEST-${companyId}-${Date.now()}`,
    is_stv: "0",
  };

  console.log("\n==============================================");
  console.log(`${label} (company_id=${companyId})`);
  console.log("==============================================");
  console.log("REQUEST:");
  console.log(JSON.stringify(payload, null, 2));

  try {
    const { data, status } = await http.post("/api/recharge", payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: () => true,
    });

    console.log("\nHTTP STATUS:", status);
    console.log("RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (err) {
    console.log("\nAXIOS ERROR");

    if (err.response) {
      console.log("HTTP:", err.response.status);
      console.log(JSON.stringify(err.response.data, null, 2));
    } else {
      console.log(err.message);
    }

    return null;
  }
}

async function run() {
  console.log("==============================================");
  console.log("MROBOTICS RECHARGE TEST");
  console.log("==============================================");

  console.log("Mobile :", MOBILE);
  console.log("Amount :", AMOUNT);
  console.log("Token  :", API_TOKEN);

  for (const [label, companyId] of Object.entries(COMPANY_IDS)) {
    const response = await tryRecharge(companyId, label);

    if (!response) continue;

    const status =
      String(response.status || response.Status || "").toLowerCase();

    if (
      status === "success" ||
      status === "pending" ||
      status === "processing"
    ) {
      console.log("\n✅ Recharge accepted using", label);
      break;
    }

    await new Promise((r) => setTimeout(r, 500));
  }
}

run();
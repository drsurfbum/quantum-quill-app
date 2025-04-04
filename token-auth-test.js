// Simple token authentication test script
async function testTokenAuthentication() {
  console.log("Starting token authentication test...");
  
  // Step 1: Create a test token
  const userId = 1; // Change this to a valid user ID in your database
  const token = `user-${userId}-${Date.now()}`;
  console.log(`Created test token: ${token}`);
  
  // Step 2: Check token diagnostics
  console.log("\nTesting token check endpoint (no auth header):");
  let response = await fetch("/api/token-check");
  let data = await response.json();
  console.log("Response:", data);
  
  // Step 3: Check with auth token
  console.log("\nTesting token check endpoint (with auth header):");
  response = await fetch("/api/token-check", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  data = await response.json();
  console.log("Response:", data);
  
  // Step 4: Try to access an authenticated endpoint
  console.log("\nTesting authenticated endpoint (with auth header):");
  response = await fetch("/api/user", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  // Check status
  console.log("Status:", response.status);
  if (response.status === 200) {
    data = await response.json();
    console.log("User data:", data);
    return { success: true, message: "Authentication successful!" };
  } else {
    const text = await response.text();
    console.log("Error:", text);
    return { success: false, message: `Authentication failed: ${response.status} - ${text}` };
  }
}

// Run the test when the script is loaded in browser console
(async () => {
  try {
    const result = await testTokenAuthentication();
    console.log("\nTest result:", result);
  } catch (error) {
    console.error("Test error:", error);
  }
})();
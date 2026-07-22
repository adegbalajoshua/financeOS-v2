async function test() {
  const res = await fetch("http://localhost:3001/api/admin/audit", { redirect: "manual" });
  console.log("Status:", res.status);
  console.log("Headers:", res.headers.get("location"));
}
test();

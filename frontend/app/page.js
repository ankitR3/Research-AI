import { cookies } from "next/headers";
import HomeClient from "./HomeClient";

export default async function Page() {
  const cookieStore = await cookies();
  const activeTab = cookieStore.get("active_tab")?.value || "API";
  
  return <HomeClient initialTab={activeTab} />;
}

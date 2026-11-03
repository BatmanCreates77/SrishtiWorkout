import { redirect } from "next/navigation";

// The password screen (/unlock) is the only way in; once unlocked, the app opens on Today.
export default function Root() {
  redirect("/home");
}

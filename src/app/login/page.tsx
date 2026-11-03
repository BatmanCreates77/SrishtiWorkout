import { redirect } from "next/navigation";

// No separate login: the site password signs this device in (see /unlock).
export default function Login() {
  redirect("/home");
}

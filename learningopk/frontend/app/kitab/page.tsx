import { redirect } from "next/navigation";

/* /kitab → Today (the default hub). */
export default function KitabIndexPage() {
  redirect("/kitab/today");
}

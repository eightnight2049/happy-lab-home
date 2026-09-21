import { redirect } from "next/navigation";

export const metadata = {
  title: "Lab Portal · Motion Intelligence Lab",
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  redirect("/studio");
}

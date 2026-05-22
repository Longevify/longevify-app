import { redirect } from "next/navigation";

/** /fitness raiz → redireciona pra musculação (sub-tab default). */
export default function FitnessIndex() {
  redirect("/fitness/musculacao");
}

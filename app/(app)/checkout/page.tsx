"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Loader2, QrCode, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/loja/product-image";
import { useCart } from "@/lib/cart/store";
import { formatBRL } from "@/lib/products";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type PaymentMethod = "card" | "pix" | "boleto";

interface FormState {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  payment: PaymentMethod;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  cpf: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  uf: "",
  payment: "card",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
};

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCEP(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCardNumber(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}
function maskCardExpiry(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, "$1/$2");
}
function maskCvv(v: string): string {
  return v.replace(/\D/g, "").slice(0, 4);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalBRL, count, clear, hydrated } = useCart();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = totalBRL;
  const shipping = useMemo(() => {
    if (items.length === 0) return 0;
    return subtotal >= 400 ? 0 : 29;
  }, [items.length, subtotal]);
  const total = subtotal + shipping;

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.error({
          title: "CEP não encontrado",
          description: "Verifique se o número está correto.",
        });
        return;
      }
      setForm((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        uf: data.uf || prev.uf,
      }));
    } catch {
      toast.error({
        title: "Falha na consulta de CEP",
        description: "Tente novamente em instantes.",
      });
    } finally {
      setCepLoading(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error({ title: "Carrinho vazio", description: "Adicione produtos antes de finalizar." });
      return;
    }
    if (!form.name || !form.email || !form.cpf || !form.phone) {
      toast.error({ title: "Preencha seus dados pessoais" });
      return;
    }
    if (!form.cep || !form.street || !form.number || !form.city || !form.uf) {
      toast.error({ title: "Endereço incompleto" });
      return;
    }
    if (form.payment === "card") {
      if (!form.cardNumber || !form.cardExpiry || !form.cardCvv) {
        toast.error({ title: "Preencha os dados do cartão" });
        return;
      }
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const orderId = `LGV-${Date.now().toString().slice(-6)}`;
      try {
        window.sessionStorage.setItem(
          "longevify.lastOrder",
          JSON.stringify({
            id: orderId,
            total,
            email: form.email,
            payment: form.payment,
          }),
        );
      } catch {
        /* ignore */
      }
      clear();
      toast.success({
        title: "Pedido criado com sucesso",
        description: `Número ${orderId}`,
      });
      router.push("/checkout/sucesso");
    }, 500);
  }

  const empty = hydrated && items.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <Link
        href="/loja"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Continuar comprando
      </Link>

      <header className="mt-4 pb-8">
        <span className="text-[13px] text-muted">Finalizar pedido</span>
        <h1 className="text-[36px] leading-[1.05] font-semibold tracking-tight">
          Checkout
        </h1>
      </header>

      {empty ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="text-[18px] font-semibold">Seu carrinho está vazio</h2>
          <p className="max-w-md text-[14px] text-muted">
            Antes de finalizar, adicione produtos da curadoria Longevify.
          </p>
          <Link href="/loja">
            <Button variant="primary">Ir para a loja</Button>
          </Link>
        </Card>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,380px)]"
          noValidate
        >
          <div className="flex flex-col gap-6">
            <Section title="Dados pessoais">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nome completo" className="sm:col-span-2">
                  <Input
                    value={form.name}
                    onChange={(v) => update("name", v)}
                    placeholder="Como está no documento"
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    value={form.phone}
                    onChange={(v) => update("phone", maskPhone(v))}
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    required
                  />
                </Field>
                <Field label="CPF">
                  <Input
                    value={form.cpf}
                    onChange={(v) => update("cpf", maskCPF(v))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
                  />
                </Field>
              </div>
            </Section>

            <Section title="Endereço de entrega">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <Field label="CEP" className="sm:col-span-2">
                  <div className="relative">
                    <Input
                      value={form.cep}
                      onChange={(v) => {
                        const masked = maskCEP(v);
                        update("cep", masked);
                        if (masked.replace(/\D/g, "").length === 8) {
                          lookupCep(masked);
                        }
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                      required
                    />
                    {cepLoading ? (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
                    ) : null}
                  </div>
                </Field>
                <Field label="Rua / Logradouro" className="sm:col-span-4">
                  <Input
                    value={form.street}
                    onChange={(v) => update("street", v)}
                    placeholder="Ex.: Avenida Paulista"
                    required
                  />
                </Field>
                <Field label="Número" className="sm:col-span-2">
                  <Input
                    value={form.number}
                    onChange={(v) => update("number", v)}
                    placeholder="123"
                    inputMode="numeric"
                    required
                  />
                </Field>
                <Field label="Complemento" className="sm:col-span-2">
                  <Input
                    value={form.complement}
                    onChange={(v) => update("complement", v)}
                    placeholder="Apto, bloco, sala"
                  />
                </Field>
                <Field label="Bairro" className="sm:col-span-2">
                  <Input
                    value={form.neighborhood}
                    onChange={(v) => update("neighborhood", v)}
                    placeholder=""
                  />
                </Field>
                <Field label="Cidade" className="sm:col-span-4">
                  <Input
                    value={form.city}
                    onChange={(v) => update("city", v)}
                    required
                  />
                </Field>
                <Field label="UF" className="sm:col-span-2">
                  <Input
                    value={form.uf}
                    onChange={(v) => update("uf", v.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    required
                  />
                </Field>
              </div>
            </Section>

            <Section title="Pagamento">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <PaymentOption
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Cartão de crédito"
                  selected={form.payment === "card"}
                  onSelect={() => update("payment", "card")}
                />
                <PaymentOption
                  icon={<QrCode className="h-4 w-4" />}
                  label="Pix"
                  selected={form.payment === "pix"}
                  onSelect={() => update("payment", "pix")}
                />
                <PaymentOption
                  icon={<ScrollText className="h-4 w-4" />}
                  label="Boleto"
                  selected={form.payment === "boleto"}
                  onSelect={() => update("payment", "boleto")}
                />
              </div>

              {form.payment === "card" ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <Field label="Número do cartão" className="sm:col-span-6">
                    <Input
                      value={form.cardNumber}
                      onChange={(v) => update("cardNumber", maskCardNumber(v))}
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      required
                    />
                  </Field>
                  <Field label="Validade (MM/AA)" className="sm:col-span-3">
                    <Input
                      value={form.cardExpiry}
                      onChange={(v) => update("cardExpiry", maskCardExpiry(v))}
                      placeholder="12/29"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      required
                    />
                  </Field>
                  <Field label="CVV" className="sm:col-span-3">
                    <Input
                      value={form.cardCvv}
                      onChange={(v) => update("cardCvv", maskCvv(v))}
                      placeholder="123"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      required
                    />
                  </Field>
                </div>
              ) : form.payment === "pix" ? (
                <p className="mt-4 rounded-[14px] bg-brand-50/70 px-4 py-3 text-[13px] text-brand-800">
                  Você receberá o QR code do Pix para pagamento após confirmar o
                  pedido. O pedido é liberado em até 5 minutos.
                </p>
              ) : (
                <p className="mt-4 rounded-[14px] bg-brand-50/70 px-4 py-3 text-[13px] text-brand-800">
                  O link do boleto chega por email após confirmar o pedido.
                  Compensação em 1 a 2 dias úteis.
                </p>
              )}
            </Section>
          </div>

          <aside className="flex flex-col gap-3">
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  Resumo
                </div>
                <div className="text-[15px] font-semibold">
                  {count} {count === 1 ? "item" : "itens"}
                </div>
              </div>

              <ul className="flex flex-col gap-3">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0">
                      <ProductImage product={product} aspect="square" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="line-clamp-2 text-[13px] font-medium leading-snug">
                        {product.name}
                      </span>
                      <span className="text-[11.5px] text-muted">
                        {quantity} × {formatBRL(product.priceBRL)}
                      </span>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {formatBRL(product.priceBRL * quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1.5 border-t border-border pt-3 text-[13px]">
                <div className="flex items-center justify-between text-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums text-ink">
                    {formatBRL(subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-muted">
                  <dt>Frete</dt>
                  <dd className="tabular-nums text-ink">
                    {shipping === 0 ? "Grátis" : formatBRL(shipping)}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1 text-[16px] font-semibold text-ink">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatBRL(total)}</dd>
                </div>
              </dl>

              <p className="rounded-[12px] bg-brand-50/60 px-3 py-2 text-[12px] text-brand-800">
                Entrega em 3 a 5 dias úteis após confirmação do pagamento.
              </p>

              <Button
                type="submit"
                variant="dark"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando
                  </>
                ) : (
                  "Finalizar pedido"
                )}
              </Button>
            </Card>
            <p className="px-1 text-[11px] text-muted">
              Ambiente de demonstração — nenhum pagamento é processado.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 w-full rounded-full border border-border bg-white px-4 text-[14px] text-ink outline-none transition",
        "placeholder:text-muted/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-200",
      )}
    />
  );
}

function PaymentOption({
  icon,
  label,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-2 rounded-[14px] border px-3 py-3 text-[13px] font-medium transition",
        selected
          ? "border-brand-500 bg-brand-50 text-brand-800"
          : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full",
          selected
            ? "bg-brand-500 text-white"
            : "bg-brand-50 text-brand-700",
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

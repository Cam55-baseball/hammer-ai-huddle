/**
 * Public bundle sales page — /b/:slug
 * Anyone with the link can view and buy. No account required to view.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, ShieldCheck, Tag, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getPublicBundle,
  recordBundleView,
  checkDiscount,
  startBundleCheckout,
  formatMoney,
  type PublicBundle,
  type DiscountCheck,
} from '@/lib/bundles';

export default function BundleStorefront() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<PublicBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [discount, setDiscount] = useState<DiscountCheck | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicBundle(slug)
      .then((b) => {
        if (cancelled) return;
        setBundle(b);
        if (b) {
          document.title = `${b.name} — Hammers Modality`;
          recordBundleView(b.id);
        }
      })
      .catch(() => setBundle(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const applyCode = async () => {
    if (!bundle || !code.trim()) return;
    setChecking(true);
    const result = await checkDiscount(code.trim(), bundle.id);
    setDiscount(result);
    setChecking(false);
    if (!result.valid) {
      toast({ title: 'Code not applied', description: result.reason, variant: 'destructive' });
    }
  };

  const buy = async () => {
    if (!bundle) return;
    setBuying(true);
    try {
      const url = await startBundleCheckout(bundle.slug, discount?.valid ? discount.code : undefined);
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Could not start checkout',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Bundle not available</h1>
          <p className="text-muted-foreground">
            This link is either wrong or the bundle isn't for sale right now.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const finalCents = discount?.valid ? discount.final_cents : bundle.price_cents;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-4">
          {bundle.cover_url ? (
            <img
              src={bundle.cover_url}
              alt={`${bundle.name} cover`}
              loading="lazy"
              className="w-full rounded-xl border object-cover aspect-video"
            />
          ) : null}
          <div className="space-y-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Video bundle
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold">{bundle.name}</h1>
            {bundle.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{bundle.description}</p>
            ) : null}
          </div>
        </header>

        <Card className="p-5 space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">One-time purchase · lifetime access</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatMoney(finalCents)}</span>
                {discount?.valid && discount.discount_cents > 0 ? (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatMoney(bundle.price_cents)}
                  </span>
                ) : null}
              </div>
            </div>
            <Button size="lg" onClick={buy} disabled={buying}>
              {buying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                <>Buy now</>
              )}
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setDiscount(null);
                }}
                placeholder="Discount code"
                className="pl-9 uppercase"
                aria-label="Discount code"
              />
            </div>
            <Button variant="outline" onClick={applyCode} disabled={checking || !code.trim()}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {discount?.valid ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              {discount.code} applied — you save {formatMoney(discount.discount_cents)}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Secure checkout. After paying, sign in (or create an account) with the same email and the
            bundle appears in your library automatically.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            What's inside · {bundle.videos.length} video{bundle.videos.length === 1 ? '' : 's'}
          </h2>
          <ul className="space-y-2">
            {bundle.videos.map((v, i) => (
              <li
                key={v.id}
                className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3"
              >
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 pt-0.5">
                  {i + 1}.
                </span>
                <PlayCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.title}</p>
                  {v.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{v.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function AlertsPage() {
  const t = await getTranslations('AlertsPage');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
    </Card>
  );
}

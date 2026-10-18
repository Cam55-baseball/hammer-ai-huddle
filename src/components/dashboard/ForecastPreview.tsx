import { HammersCard } from "@/components/intelligence/HammersCard";

/** Day tone is not measured evidence of future growth. No forecast is certified here. */
export function ForecastPreview() {
  return (
    <HammersCard
      title="Your progress check"
      weSee="Future progress: Need more data. We can't tell what will improve next from today's check-in."
      howSure="need_more_data"
      doThis="Keep logging your games and check-ins."
      checkBack="After your next saved test or game."
    />
  );
}

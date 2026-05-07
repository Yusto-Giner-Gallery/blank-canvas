export function formatSize(
  width_cm: number | null,
  height_cm: number | null,
  depth_cm: number | null,
) {
  const parts = [width_cm, height_cm, depth_cm].filter(
    (n): n is number => typeof n === "number",
  );
  if (parts.length === 0) return null;
  return `${parts.join(" × ")} cm`;
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

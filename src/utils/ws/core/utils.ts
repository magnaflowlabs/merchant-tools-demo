export const generateUniqueId = (prefix: string = ""): string => {
  const uuid = [Date.now(), Math.random()].map(v => v.toString(36).substring(2, 8)).join("");
  return [prefix, uuid].join("");
}
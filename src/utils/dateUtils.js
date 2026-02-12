export const parseDate = (date) => {
  if (!date) return new Date();
  if (date?.seconds) return new Date(date.seconds * 1000); // Firestore Timestamp
  if (date instanceof Date) return date;
  return new Date(date);
};
exports.getLast7Months = () => {
  const months = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(monthString);
  }

  return months.reverse();
};

export const pathJoin = (path: string, subPath: string) => {
  return (
    '/' +
    path
      .split('/')
      .concat(subPath.split('/'))
      .filter((p) => p)
      .join('/')
  )
}

const Months: string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const formatDate = (date: string) => {
  try {
    const yyyy = date.slice(0, 4);
    const mm = date.slice(5, 7);
    const dd = date.slice(8, 10);
    const y = new Number(yyyy);
    const m = new Number(mm);
    const d = new Number(dd);

    return `${Months[m as number - 1]} ${d}, ${y}`;
  } catch (e) {
    console.error(e);
    return '----';
  }
}

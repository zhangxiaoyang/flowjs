module.exports = [
  [
    {
      id: 'a',
      fx: 'request',
      x: `{
        url: $$('x.urls')[0],
      }`,
      y: `JSON.parse($('fx')).args.test`,
    },
    {
      id: 'b',
      fx: 'request',
      x: `{
        url: $$('x.urls')[1],
      }`,
      y: `JSON.parse($('fx')).args.test`,
    },
  ],
  [
    {
      id: 'c',
      y: `$$('a.y') + $$('b.y')`,
    },
  ],
]

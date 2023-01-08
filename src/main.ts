import { Match, Node, WGraph, search } from '../lib/search';

type DomNode = Node & {
  element: HTMLElement;
};

const load = (): WGraph<DomNode> => {
  const textElement = document.getElementById('text');
  const wg: WGraph<DomNode> = [];

  const extract = (element: HTMLElement, to: number[]): number[] => {
    if (element.nodeType === document.TEXT_NODE) {
      const i = wg.length;
      wg.push({
        text: element.textContent ?? '',
        to,
        element,
      });
      return [i];
    }

    if (element.tagName === 'RUBY') {
      let is = to;
      let rt: number[] = [];
      let child = element.lastChild as HTMLElement;
      while (child !== null) {
        if (child.nodeType === document.TEXT_NODE || child.tagName === 'RB') {
          is = extract(child, is).concat(rt);
          rt = [];
        } else if (child.tagName === 'RT') {
          rt = extract(child, is);
        }
        child = child.previousSibling as HTMLElement;
      }
      return is;
    }

    let is = to;
    let child = element.lastChild as HTMLElement;
    while (child !== null) {
      is = extract(child, is);
      child = child.previousSibling as HTMLElement;
    }
    return is;
  };

  extract(textElement as HTMLElement, []);

  return wg;
};

const textNode = (text: string) => document.createTextNode(text);
const markNode = (text: string) => {
  const node = document.createElement('mark');
  node.textContent = text;
  return node;
}

const resets: (() => void)[] = [];
let result: Match[] = [];
let index  = 0;

const highlight = (i: number) => {
  for (const reset of resets) {
    reset();
  }
  resets.length = 0;

  const wg = load();
  index = i;
  document.querySelector('#result-counter')!.textContent = `${index + 1}/${result.length}`;
  const r = result[index];
  for (let i = 0; i < r.nodeIds.length; i++) {
    const id = r.nodeIds[i];
    const node = wg[id];
    const text = node.text;
    const start = i === 0 ? r.start : 0;
    const end = i === r.nodeIds.length - 1 ? r.end : node.text.length;
    const parent = node.element.parentElement!;
    const span = document.createElement('span');
    span.appendChild(textNode(text.slice(0, start)));
    span.appendChild(markNode(text.slice(start, end)));
    span.appendChild(textNode(text.slice(end, text.length)));
    parent.insertBefore(span, node.element);
    parent.removeChild(node.element);
    if (i === 0) {
      span.scrollIntoView({
        block: 'center',
      });
    }
    resets.push(() => {
      parent.insertBefore(textNode(text), span);
      parent.removeChild(span);
    });
  }
};

document.querySelector('#search')!.addEventListener('click', () => {
  for (const reset of resets) {
    reset();
  }
  resets.length = 0;

  const wg = load();
  const pattern = (document.querySelector('#pattern') as HTMLInputElement).value;

  const start = performance.now();
  result = search(wg, pattern);
  const time = performance.now() - start;
  document.querySelector('#time')!.textContent = `${(time * 1000).toFixed(0)} μs`;

  if (result.length > 0) {
    document.querySelector('#result')!.classList.remove('hidden');
    highlight(0);
  } else {
    document.querySelector('#result')!.classList.add('hidden');
  }
});

document.querySelector('#prev')?.addEventListener('click', () => {
  highlight(index === 0 ? result.length - 1 : index - 1);
});

document.querySelector('#next')?.addEventListener('click', () => {
  highlight(index === result.length - 1 ? 0 : index + 1);
});
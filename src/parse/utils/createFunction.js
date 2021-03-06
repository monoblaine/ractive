export function fromExpression(body, length = 0) {
  const args = new Array(length);

  while (length--) {
    args[length] = `_${length}`;
  }

  // Functions created directly with new Function() look like this:
  //     function anonymous (_0 /**/) { return _0*2 }
  //
  // With this workaround, we get a little more compact:
  //     function (_0){return _0*2}
  return new Function([], `return function (${args.join(',')}){return(${body});};`)();
}

(() => {
  const proto = window.HTMLDialogElement?.prototype;
  if (!proto || proto.__hnsSafeModalPatched) return;

  const nativeShowModal = proto.showModal;
  proto.showModal = function(...args) {
    if (this.open) return;
    return nativeShowModal.apply(this, args);
  };

  Object.defineProperty(proto, '__hnsSafeModalPatched', { value: true });
})();

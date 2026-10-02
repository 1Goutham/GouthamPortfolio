"use client";

import { forwardRef } from "react";
import { SendHorizontal } from "lucide-react";

type Props = {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  busy?: boolean;
};

/** Light pill on the dark panel; the send button takes off when a message goes. */
const InputBox = forwardRef<HTMLInputElement, Props>(function InputBox(
  { input, setInput, sendMessage, handleKeyDown, busy = false },
  ref
) {
  return (
    <div className="gtalk-input flex w-full items-center gap-1 rounded-full bg-[#e9e9e9] p-1 pl-2" data-busy={busy}>
      <input
        ref={ref}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        className="min-w-0 flex-grow bg-transparent px-3 py-2 text-sm text-black outline-none placeholder:text-[#8a8a8a] md:text-[15px]"
        placeholder={busy ? "Thinking…" : "Type something to get started…"}
        aria-label="Ask G-Talk a question"
      />
      <button
        type="button"
        onClick={sendMessage}
        disabled={busy}
        aria-label="Send message"
        className="gtalk-send btn-tactile flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:cursor-default"
      >
        <SendHorizontal className="gtalk-send-icon h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
});

export default InputBox;

import Image from "next/image";

export default function InputBox({
  input,
  setInput,
  sendMessage,
  handleKeyDown,
}: {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
<div className="flex w-[300px] md:w-[770px]  flex-nowrap rounded-full bg-[#E8E8E8] p-1 items-center gap-1 overflow-hidden">
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    className="flex-grow min-w-0 px-4 py-2 text-black placeholder:text-[#969696] bg-transparent outline-none"
    placeholder="Write a message"
  />
  <button
    onClick={sendMessage}
    className="bg-black px-4 py-2 h-10 rounded-full flex items-center gap-2 hover:scale-107 whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out"
  >
    <Image src="/vector.png" alt="send" width={13} height={13} />
  </button>
</div>
  );
}
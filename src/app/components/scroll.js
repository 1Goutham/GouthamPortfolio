import ScrollVelocity from "./layout/scrollingtext";

export default function Scrolltext() {
  return (
    <div className="bg-white h-12 md:h-24 flex justify-center items-center ">
      <ScrollVelocity
        texts={[
    <span key="line1">
      Good <span className="font-semibold">design</span> makes you stay&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;
      Great <span className="font-semibold">UX</span> makes you move&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;
      Smart <span className="font-semibold">code</span> makes it all possible&nbsp;&nbsp;&nbsp;&nbsp;✦
    </span>
        ]}
        velocity={50}
        scrollerStyle={{ fontFamily: "var(--font-montserrat)" }}
        className="text-black text-lg md:text-3xl font-regular"
        
      />
    </div>
  );
}

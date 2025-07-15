'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import ScrollReveal from './layout/scrollreveal';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const scrollRef = useRef(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Sending your message ✉️');

    try {
      const res = await fetch('https://formspree.io/f/xgvzewbv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      toast.dismiss(loadingToast);

      if (res.ok) {
        toast.success('Message sent!');
        setFormData({ name: '', email: '', message: '' });
      } else {
        toast.error('Failed to send. Try again.');
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong.');
    }
  };

  return (
    <div className="bg-black flex flex-col justify-between pt-10 ">
      {/* Top Section */}
      <div className="flex flex-col items-center text-white py-10 px-4 space-y-8">
        {/* Emoji + Heading */}
        <div className="flex flex-row items-center space-y-2 gap-2 md:gap-5">
          <Image
            src="/emoji.png"
            alt="emoji"
            width={150}
            height={80}
            className="rounded-full w-25 md:w-35"
          />
          <ScrollReveal
            scrollContainerRef={scrollRef}
            baseOpacity={0}
            enableBlur={true}
            baseRotation={5}
            blurStrength={10}
          >
            <h1 className="text-xl md:text-4xl font-outfit font-medium text-left">
              Drop me a line <br /> Want to get in touch?
            </h1>
          </ScrollReveal>
        </div>

        {/* Contact Form */}
        <div className="w-full max-w-3xl space-y-6">
          <div>
            <h2 className="text-2xl font-outfit font-normal">Contact me</h2>
            <p className="text-lg font-outfit text-gray-300">I&apos;d love to hear from you :)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-lg shadow-inner placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              />
              <input
                type="email"
                name="email"
                placeholder="Email ID"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-lg shadow-inner placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              />
            </div>
            <textarea
              name="message"
              placeholder="Message"
              rows={5}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full p-3  rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-lg shadow-inner placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
            />
            <button
              type="submit"
              className="bg-white/20 text-white border border-white/30 px-6 py-2 rounded-md backdrop-blur-lg hover:bg-white/30"
            >
              Submit
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-center md:mt-10 py-2 md:py-6 font-outfit text-black text-xs md:text-2xl  font-normal">
        © 2025 Goutham Gopinath • Full Stack Developer & Designer
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Github,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Edit these to change what the section shows. Leave a social `href` empty to
// hide that icon.
// ---------------------------------------------------------------------------
const CONTACT = {
  email: 'gouthamgopinath.tsi@gmail.com',
  location: 'Chennai, India',
};

const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/goutham-g-98a0ba253/', Icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/1Goutham', Icon: Github },
  { label: 'Instagram', href: 'https://www.instagram.com/tanger.ineee/', Icon: Instagram },
  { label: 'X', href: '', Icon: XIcon },
].filter((s) => s.href);

const FORM_ENDPOINT = 'https://formspree.io/f/xgvzewbv';

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type Status = 'idle' | 'sending' | 'sent';

/** Split a heading into per-character spans so they can rise in one by one. */
function SplitHeading({
  text,
  className,
  ...rest
}: { text: string; className?: string } & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={className} aria-label={text} {...rest}>
      {text.split(' ').map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden align-bottom pb-[0.08em]" aria-hidden="true">
          {word.split('').map((ch, ci) => (
            <span key={ci} className="contact-char inline-block will-change-transform">
              {ch}
            </span>
          ))}
          {wi < text.split(' ').length - 1 && <span className="inline-block w-[0.22em]" />}
        </span>
      ))}
    </h1>
  );
}

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [copied, setCopied] = useState(false);

  // Letter wave: once the heading has risen in, its characters lift toward
  // the cursor with a gaussian falloff, so the giant type feels like it
  // has some give. Positions are measured once per pass, writes are rAF'd.
  const waveReady = useRef(false);
  const waveRaf = useRef(0);
  const onHeadingMove = (e: React.PointerEvent<HTMLHeadingElement>) => {
    if (!waveReady.current || e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const h = e.currentTarget;
    const cx = e.clientX;
    if (waveRaf.current) return;
    waveRaf.current = requestAnimationFrame(() => {
      waveRaf.current = 0;
      h.querySelectorAll<HTMLElement>('.contact-char').forEach((ch) => {
        const r = ch.getBoundingClientRect();
        const d = (r.left + r.width / 2 - cx) / 110;
        const lift = 0.16 * Math.exp(-d * d);
        ch.style.transform = `translateY(${(-lift * 100).toFixed(2)}%)`;
      });
    });
  };
  const onHeadingLeave = (e: React.PointerEvent<HTMLHeadingElement>) => {
    e.currentTarget.querySelectorAll<HTMLElement>('.contact-char').forEach((ch) => {
      ch.style.transform = '';
    });
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Scroll-driven entrance: heading characters rise, then the two columns fade up.
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.contact-char', {
          yPercent: 110,
          rotate: 3,
          opacity: 0,
          duration: 0.9,
          ease: 'power4.out',
          stagger: 0.028,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
          onComplete: () => {
            waveReady.current = true;
          },
        });
        gsap.from('.contact-reveal', {
          y: 28,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: 'top 60%', once: true },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  // Magnetic button: drifts a little toward the cursor, snaps back on leave.
  const onButtonMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = buttonRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
  };
  const onButtonLeave = () => {
    if (buttonRef.current) buttonRef.current.style.transform = '';
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      toast.success('Email copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${CONTACT.email}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('sending');

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          message: form.message,
        }),
      });

      if (res.ok) {
        setStatus('sent');
        setForm({ firstName: '', lastName: '', email: '', message: '' });
        toast.success('Message sent. Talk soon!');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('idle');
        toast.error('Failed to send. Try again.');
      }
    } catch {
      setStatus('idle');
      toast.error('Something went wrong.');
    }
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="contact relative overflow-hidden bg-black text-white font-outfit"
    >
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-10 md:px-12 md:pt-28">
        {/* Giant heading */}
        <SplitHeading
          text="Contact me"
          onPointerMove={onHeadingMove}
          onPointerLeave={onHeadingLeave}
          className="contact-heading font-bold leading-[0.95] tracking-[-0.035em] text-[clamp(3.4rem,13.5vw,11.5rem)] text-[#f5f3ef]"
        />

        <div className="mt-14 grid gap-14 md:mt-20 md:grid-cols-2 md:gap-20">
          {/* Left: let's talk */}
          <div className="space-y-10">
            <div className="contact-reveal space-y-4">
              <p className="font-anonymous-pro text-xs uppercase tracking-[0.4em] text-white/55">Let&apos;s talk</p>
              <p className="max-w-md text-xl leading-snug text-white/90 md:text-2xl">
                Have a project, an idea, or just want to say hello? I&apos;d love to hear from you.
              </p>
            </div>

            <ul className="contact-reveal space-y-4 text-base md:text-lg">
              <li>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="contact-row group flex items-center gap-4 text-left cursor-pointer"
                  aria-label={`Copy email ${CONTACT.email}`}
                >
                  <Mail className="contact-icon h-5 w-5 text-white/70" strokeWidth={1.75} />
                  <span className="link-underline">{CONTACT.email}</span>
                  <span className="ml-1 flex h-5 w-5 items-center justify-center text-white/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {copied ? <Check className="h-4 w-4 text-[#9DFF50]" /> : <Copy className="h-4 w-4" />}
                  </span>
                </button>
              </li>
              <li className="contact-row group flex items-center gap-4">
                <MapPin className="contact-icon h-5 w-5 text-white/70" strokeWidth={1.75} />
                <span>{CONTACT.location}</span>
              </li>
            </ul>

            {SOCIALS.length > 0 && (
              <div className="contact-reveal flex items-center gap-3">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="social-btn flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right: form */}
          <form onSubmit={handleSubmit} className="contact-reveal space-y-9" noValidate={false}>
            <fieldset className="space-y-3">
              <legend className="text-sm text-white/70">Name <span className="text-white/40">(required)</span></legend>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="field">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    required
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={update('firstName')}
                  />
                  <span className="field-line" aria-hidden="true" />
                </label>
                <label className="field">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={update('lastName')}
                  />
                  <span className="field-line" aria-hidden="true" />
                </label>
              </div>
            </fieldset>

            <label className="field block">
              <span className="mb-3 block text-sm text-white/70">Email <span className="text-white/40">(required)</span></span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
              />
              <span className="field-line" aria-hidden="true" />
            </label>

            <label className="field block">
              <span className="mb-3 block text-sm text-white/70">Message <span className="text-white/40">(required)</span></span>
              <textarea
                name="message"
                rows={3}
                required
                value={form.message}
                onChange={update('message')}
                className="resize-y"
              />
              <span className="field-line" aria-hidden="true" />
            </label>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <button
                ref={buttonRef}
                type="submit"
                onMouseMove={onButtonMove}
                onMouseLeave={onButtonLeave}
                disabled={status !== 'idle'}
                aria-busy={status === 'sending'}
                data-status={status}
                className="send-btn group inline-flex items-center gap-3 bg-[#f5f3ef] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-black cursor-pointer disabled:cursor-default"
              >
                <span className="relative z-10">
                  {status === 'sent' ? 'Sent' : status === 'sending' ? 'Sending' : 'Send message'}
                </span>
                <span className="relative z-10 flex h-4 w-4 items-center justify-center">
                  {status === 'sent' ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : status === 'sending' ? (
                    <span className="send-dot block h-2 w-2 rounded-full bg-black" />
                  ) : (
                    <ArrowRight className="nudge-x h-4 w-4" strokeWidth={2.25} />
                  )}
                </span>
              </button>
              <p className="text-xs text-white/40">Usually replies within a day.</p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-20 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between md:text-sm">
          <p>© {new Date().getFullYear()} Goutham Gopinath</p>
          <p className="hidden sm:block">Full Stack Developer &amp; Designer</p>
          <a href="#" className="group inline-flex items-center gap-1 self-start text-white/60 transition-colors hover:text-white sm:self-auto">
            Back to top
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </a>
        </footer>
      </div>
    </section>
  );
}

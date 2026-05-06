import Image from "next/image";
import NavCtaLink from "../../app/nav-cta-link";
import Nav from "../nav/page"
export default function Header() {
    return (<header id="site-nav" className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <a href="#top" className="flex flex-col items-start gap-1">
                <Image
                    src="/logo.png"
                    alt="Rush N Dush Logistics LLC logo"
                    width={136}
                    height={56}
                    className="h-10 w-auto rounded-md object-contain sm:h-12"
                />
                <p className="text-xs font-extrabold leading-tight tracking-tight text-[var(--color-navy)] sm:text-sm">
                    Rush N Dush Logistics
                </p>
            </a>
            <Nav />
            <NavCtaLink />
        </div>
    </header>);
}
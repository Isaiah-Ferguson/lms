import Image from "next/image";
import csaLogo from "@/assets/codestack.png";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Three-column grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Col 1 — Logo + blurb */}
          <div className="flex flex-col gap-4">
            <Image
              src={csaLogo}
              alt="CodeStack Academy"
              height={40}
              width={160}
              className="h-12 w-auto object-contain "
            />
            <p className="text-sm leading-relaxed text-gray-400">
              Code Stack Academy is developed by CodeStack, a department of
              the San Joaquin County Office of Education.
            </p>
          </div>

          {/* Col 2 — Contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h3>
            <address className="not-italic text-sm leading-relaxed text-gray-400 space-y-1">
              <p>2911 Transworld Dr.</p>
              <p>Stockton, CA 95206</p>
              <p>
                <span className="text-gray-300 font-medium">Phone:</span>{" "}
                <a href="tel:2094685924" className="hover:text-white transition-colors">
                  (209) 468-5924
                </a>
              </p>
              <p>
                <span className="text-gray-300 font-medium">E-mail:</span>{" "}
                <a
                  href="mailto:info@codestackacademy.org"
                  className="hover:text-white transition-colors"
                >
                  info@codestackacademy.org
                </a>
              </p>
            </address>
          </div>

          {/* Col 3 — Social media */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Follow Us
            </h3>
            <div className="flex gap-4">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/codestackstockton"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-brand-600 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12a10 10 0 1 0-11.563 9.876v-6.988H7.898V12h2.539V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.888h-2.33v6.988A10.003 10.003 0 0 0 22 12z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/codestackacademy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-pink-600 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.975 1.246 2.242 1.308 3.608.058 1.265.07 1.645.07 4.851s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.974-2.242 1.246-3.608 1.308-1.265.058-1.645.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308C2.497 19.466 2.225 18.2 2.163 16.833 2.105 15.568 2.093 15.188 2.093 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.446 2.567 5.713 2.295 7.08 2.233 8.344 2.175 8.724 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.013 8.332 0 8.741 0 12c0 3.259.013 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.059-1.28.072-1.689.072-4.948s-.013-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/@CodeStackSJ"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-xs text-gray-100">
          Copyright &copy; {new Date().getFullYear()} Code Stack Academy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

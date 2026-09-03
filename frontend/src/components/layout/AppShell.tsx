import type {
  ReactNode,
} from "react";

import {
  Activity,
  CloudRain,
  LogOut,
  Map,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";

import DigitalClock from "../common/DigitalClock";


export type PageKey =
  | "command"
  | "flood"
  | "drainage"
  | "rescue"
  | "routes"
  | "response";


type Props = {
  children:
    ReactNode;

  activePage:
    PageKey;

  onNavigate: (
    page:
      PageKey,
  ) => void;

  backendOnline:
    boolean;

  checkingBackend:
    boolean;

  userEmail:
    string;

  onSignOut:
    () => void;
};


/* ====================================================== */
/* APP SHELL                                              */
/* ====================================================== */

function AppShell({
  children,
  activePage,
  onNavigate,
  backendOnline,
  checkingBackend,
  userEmail,
  onSignOut,
}: Props) {
  return (
    <main
      className="
        min-h-screen
        p-4
        lg:p-8
      "
    >
      <div
        className="
          mx-auto
          max-w-[1700px]
        "
      >
        {/* ================================================= */}
        {/* GLOBAL TOP BAR                                    */}
        {/* ================================================= */}

        <header
          className="
            glass-panel
            rounded-[28px]
            px-5
            py-4
            lg:px-6
            lg:py-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >
            {/* ============================================= */}
            {/* BRAND                                         */}
            {/* ============================================= */}

            <div
              className="
                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#007cf7]/15
                  text-[#4da3ff]
                "
              >
                <CloudRain
                  size={26}
                />
              </div>

              <div>
                <h1
                  className="
                    text-2xl
                    font-semibold
                    tracking-tight
                  "
                >
                  FloodTwin

                  <span
                    className="
                      ml-2
                      text-[#4da3ff]
                    "
                  >
                    AI
                  </span>
                </h1>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    text-slate-400
                    sm:text-xs
                    sm:tracking-[0.22em]
                  "
                >
                  Urban Flood
                  Command Center
                </p>
              </div>
            </div>

            {/* ============================================= */}
            {/* GLOBAL STATUS                                 */}
            {/* ============================================= */}

            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:flex-wrap
                sm:items-center
                xl:justify-end
              "
            >
              {/* DIGITAL CLOCK */}

              <DigitalClock />

              {/* STUDY AREA */}

              <div
                className="
                  hidden
                  rounded-2xl
                  border
                  border-[#007cf7]/20
                  bg-[#007cf7]/10
                  px-4
                  py-3
                  text-xs
                  text-[#8cc7ff]
                  lg:block
                "
              >
                <p
                  className="
                    text-[9px]
                    uppercase
                    tracking-[0.14em]
                    text-slate-500
                  "
                >
                  Operational Area
                </p>

                <p
                  className="
                    mt-1
                    font-medium
                    text-[#8cc7ff]
                  "
                >
                  Velachery •
                  CHN01-C01
                </p>
              </div>

              {/* BACKEND STATUS */}

              <span
                className={`
                  flex
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  px-4
                  py-3
                  text-xs
                  font-medium

                  ${
                    checkingBackend
                      ? `
                        border-yellow-400/20
                        bg-yellow-400/10
                        text-yellow-300
                      `
                      : backendOnline
                        ? `
                          border-emerald-400/20
                          bg-emerald-400/10
                          text-emerald-300
                        `
                        : `
                          border-red-400/20
                          bg-red-400/10
                          text-red-300
                        `
                  }
                `}
              >
                {checkingBackend
                  ? "● CONNECTING..."
                  : backendOnline
                    ? "● SYSTEM ONLINE"
                    : "● BACKEND OFFLINE"}
              </span>

              <button
                type="button"
                onClick={onSignOut}
                title={`Sign out ${userEmail}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-300 transition hover:border-red-400/25 hover:bg-red-400/10 hover:text-red-300"
              >
                <LogOut size={15} />
                <span className="max-w-40 truncate">
                  Sign out
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* ================================================= */}
        {/* APP BODY                                          */}
        {/* ================================================= */}

        <section
          className="
            mt-5
            grid
            gap-5
            xl:grid-cols-[245px_1fr]
          "
        >
          {/* =============================================== */}
          {/* GLOBAL SIDEBAR                                  */}
          {/* =============================================== */}

          <aside
            className="
              glass-panel
              h-fit
              rounded-[28px]
              p-4
              xl:sticky
              xl:top-5
            "
          >
            <p
              className="
                px-3
                pb-4
                text-xs
                uppercase
                tracking-[0.2em]
                text-slate-500
              "
            >
              Navigation
            </p>

            <nav
              className="
                space-y-2
              "
            >
              <SideItem
                icon={
                  <Activity
                    size={18}
                  />
                }
                label="Command Center"
                active={
                  activePage ===
                  "command"
                }
                onClick={() =>
                  onNavigate(
                    "command",
                  )
                }
              />

              <SideItem
                icon={
                  <Map
                    size={18}
                  />
                }
                label="Flood Map"
                active={
                  activePage ===
                  "flood"
                }
                onClick={() =>
                  onNavigate(
                    "flood",
                  )
                }
              />

              <SideItem
                icon={
                  <ShieldAlert
                    size={18}
                  />
                }
                label="Drainage Intelligence"
                active={
                  activePage ===
                  "drainage"
                }
                onClick={() =>
                  onNavigate(
                    "drainage",
                  )
                }
              />

              <SideItem
                icon={
                  <Users
                    size={18}
                  />
                }
                label="Rescue & Evacuation"
                active={
                  activePage ===
                  "rescue"
                }
                onClick={() =>
                  onNavigate(
                    "rescue",
                  )
                }
              />

              <SideItem
                icon={
                  <Route
                    size={18}
                  />
                }
                label="Route Analyzer"
                active={
                  activePage ===
                  "routes"
                }
                onClick={() =>
                  onNavigate(
                    "routes",
                  )
                }
              />

              <SideItem
                icon={
                  <ShieldAlert
                    size={18}
                  />
                }
                label="Response Planner"
                active={
                  activePage ===
                  "response"
                }
                onClick={() =>
                  onNavigate(
                    "response",
                  )
                }
              />
            </nav>

            {/* ============================================= */}
            {/* STUDY AREA                                    */}
            {/* ============================================= */}

            <div
              className="
                mt-6
                rounded-2xl
                border
                border-[#007cf7]/15
                bg-[#007cf7]/5
                p-4
              "
            >
              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.16em]
                  text-slate-500
                "
              >
                Study Area
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-[#8cc7ff]
                "
              >
                Velachery
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Chennai • C01
              </p>
            </div>

            {/* ============================================= */}
            {/* DATA STATUS                                   */}
            {/* ============================================= */}

            <div
              className="
                mt-3
                rounded-2xl
                border
                border-amber-400/15
                bg-amber-400/5
                p-4
              "
            >
              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.15em]
                  text-amber-300
                "
              >
                Demo Model Data
              </p>

              <p
                className="
                  mt-2
                  text-[10px]
                  leading-4
                  text-slate-500
                "
              >
                OSM geospatial context
                and live backend
                services enabled.
              </p>
            </div>
          </aside>

          {/* =============================================== */}
          {/* CURRENT PAGE                                    */}
          {/* =============================================== */}

          <div
            className="
              min-w-0
            "
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}


/* ====================================================== */
/* SIDEBAR ITEM                                           */
/* ====================================================== */

function SideItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon:
    ReactNode;

  label:
    string;

  active:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        w-full
        items-center
        gap-3
        rounded-2xl
        border
        px-4
        py-3
        text-left
        text-sm
        transition-all
        duration-200

        ${
          active
            ? `
              border-[#007cf7]/30
              bg-[#007cf7]/20
              text-[#8cc7ff]
              shadow-[0_0_22px_rgba(0,124,247,0.10)]
            `
            : `
              border-transparent
              text-slate-400
              hover:border-white/5
              hover:bg-white/5
              hover:text-white
            `
        }
      `}
    >
      <span
        className={
          active
            ? "text-[#4da3ff]"
            : "text-slate-500"
        }
      >
        {icon}
      </span>

      {label}
    </button>
  );
}


export default AppShell;

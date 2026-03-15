"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "gsap";

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
  onClick?: () => void;
}

export interface StaggeredMenuProps {
  position?: "left" | "right";
  colors?: string[];
  items?: StaggeredMenuItem[];
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export function StaggeredMenu({
  position = "right",
  colors = ["#9EF2B2", "#27FF64"],
  items = [],
  displayItemNumbering = true,
  className,
  logoUrl,
  menuButtonColor = "#fff",
  openMenuButtonColor = "#fff",
  accentColor = "#27FF64",
  changeMenuColorOnOpen = true,
  onMenuOpen,
  onMenuClose,
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false);
  const [textLines, setTextLines] = useState<string[]>(["菜单", "关闭"]);

  // Synchronous refs for values used in GSAP callbacks
  const openRef = useRef(false);
  const busyRef = useRef(false);

  // DOM refs
  const panelRef = useRef<HTMLElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  const plusHRef = useRef<HTMLSpanElement>(null);
  const plusVRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const textInnerRef = useRef<HTMLSpanElement>(null);
  const textWrapRef = useRef<HTMLSpanElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // GSAP animation refs
  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const spinTweenRef = useRef<gsap.core.Timeline | null>(null);
  const textCycleAnimRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);
  const itemEntranceTweenRef = useRef<gsap.core.Tween | null>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);

  // Props ref so GSAP callbacks always see the latest prop values
  const propsRef = useRef({
    position,
    menuButtonColor,
    openMenuButtonColor,
    changeMenuColorOnOpen,
    onMenuOpen,
    onMenuClose,
  });
  useEffect(() => {
    propsRef.current = {
      position,
      menuButtonColor,
      openMenuButtonColor,
      changeMenuColorOnOpen,
      onMenuOpen,
      onMenuClose,
    };
  });

  const processedColors = useMemo(() => {
    const raw =
      colors && colors.length ? colors.slice(0, 4) : ["#20251F", "#353F37"];
    const arr = [...raw];
    if (arr.length >= 3) {
      const mid = Math.floor(arr.length / 2);
      arr.splice(mid, 1);
    }
    return arr;
  }, [colors]);

  const initializeGSAP = useCallback(() => {
    if (gsapContextRef.current) gsapContextRef.current.revert();
    gsapContextRef.current = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;

      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers: HTMLElement[] = [];
      if (preContainer) {
        preLayers = Array.from(
          preContainer.querySelectorAll(".sm-prelayer")
        ) as HTMLElement[];
      }
      preLayerElsRef.current = preLayers;

      const offscreen =
        propsRef.current.position === "left" ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen });
      gsap.set(plusH, { transformOrigin: "50% 50%", rotate: 0 });
      gsap.set(plusV, { transformOrigin: "50% 50%", rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: "50% 50%" });
      gsap.set(textInner, { yPercent: 0 });

      if (toggleBtnRef.current) {
        gsap.set(toggleBtnRef.current, {
          color: propsRef.current.menuButtonColor,
        });
      }
    });
  }, []);

  const buildOpenTimeline =
    useCallback((): gsap.core.Timeline | null => {
      const panel = panelRef.current;
      const layers = preLayerElsRef.current;
      if (!panel) return null;

      openTlRef.current?.kill();
      if (closeTweenRef.current) {
        closeTweenRef.current.kill();
        closeTweenRef.current = null;
      }
      itemEntranceTweenRef.current?.kill();

      const itemEls = Array.from(
        panel.querySelectorAll(".sm-panel-itemLabel")
      ) as HTMLElement[];
      const numberEls = Array.from(
        panel.querySelectorAll(
          ".sm-panel-list[data-numbering] .sm-panel-item"
        )
      ) as HTMLElement[];

      const layerStates = layers.map((el: HTMLElement) => ({
        el,
        start: Number(gsap.getProperty(el, "xPercent")),
      }));
      const panelStart = Number(gsap.getProperty(panel, "xPercent"));

      if (itemEls.length)
        gsap.set(itemEls, { yPercent: 140, rotate: 10 });
      if (numberEls.length)
        gsap.set(numberEls, {
          "--sm-num-opacity": 0,
        } as gsap.TweenVars);

      const tl = gsap.timeline({ paused: true });

      layerStates.forEach(
        ({ el, start }: { el: HTMLElement; start: number }, i: number) => {
          tl.fromTo(
            el,
            { xPercent: start },
            { xPercent: 0, duration: 0.5, ease: "power4.out" },
            i * 0.07
          );
        }
      );

      const lastTime = layerStates.length
        ? (layerStates.length - 1) * 0.07
        : 0;
      const panelInsertTime =
        lastTime + (layerStates.length ? 0.08 : 0);
      const panelDuration = 0.65;

      tl.fromTo(
        panel,
        { xPercent: panelStart },
        { xPercent: 0, duration: panelDuration, ease: "power4.out" },
        panelInsertTime
      );

      if (itemEls.length) {
        const itemsStartRatio = 0.15;
        const itemsStart =
          panelInsertTime + panelDuration * itemsStartRatio;

        tl.to(
          itemEls,
          {
            yPercent: 0,
            rotate: 0,
            duration: 1,
            ease: "power4.out",
            stagger: { each: 0.1, from: "start" },
          },
          itemsStart
        );

        if (numberEls.length) {
          tl.to(
            numberEls,
            {
              duration: 0.6,
              ease: "power2.out",
              "--sm-num-opacity": 1,
              stagger: { each: 0.08, from: "start" },
            } as gsap.TweenVars,
            itemsStart + 0.1
          );
        }
      }

      openTlRef.current = tl;
      return tl;
    }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all: HTMLElement[] = [...layers, panel];
    closeTweenRef.current?.kill();

    const offscreen =
      propsRef.current.position === "left" ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: () => {
        const itemEls = Array.from(
          panel.querySelectorAll(".sm-panel-itemLabel")
        ) as HTMLElement[];
        if (itemEls.length)
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });

        const numberEls = Array.from(
          panel.querySelectorAll(
            ".sm-panel-list[data-numbering] .sm-panel-item"
          )
        ) as HTMLElement[];
        if (numberEls.length)
          gsap.set(numberEls, {
            "--sm-num-opacity": 0,
          } as gsap.TweenVars);

        busyRef.current = false;
      },
    });
  }, []);

  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    const h = plusHRef.current;
    const v = plusVRef.current;
    if (!icon || !h || !v) return;

    spinTweenRef.current?.kill();

    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: "50% 50%" });
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .to(h, { rotate: 45, duration: 0.5 }, 0)
        .to(v, { rotate: -45, duration: 0.5 }, 0);
    } else {
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: "power3.inOut" } })
        .to(h, { rotate: 0, duration: 0.35 }, 0)
        .to(v, { rotate: 90, duration: 0.35 }, 0)
        .to(icon, { rotate: 0, duration: 0.001 }, 0);
    }
  }, []);

  const animateColor = useCallback((opening: boolean) => {
    const btn = toggleBtnRef.current;
    if (!btn) return;
    colorTweenRef.current?.kill();
    const {
      changeMenuColorOnOpen: cmco,
      openMenuButtonColor: oc,
      menuButtonColor: mc,
    } = propsRef.current;
    if (cmco) {
      const targetColor = opening ? oc : mc;
      colorTweenRef.current = gsap.to(btn, {
        color: targetColor,
        delay: 0.18,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.set(btn, { color: mc });
    }
  }, []);

  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current;
    if (!inner) return;

    textCycleAnimRef.current?.kill();

    const valueLabel = opening ? "菜单" : "关闭";
    const targetLabel = opening ? "关闭" : "菜单";
    const cycles = 3;

    const seq: string[] = [valueLabel];
    let last = valueLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === "菜单" ? "关闭" : "菜单";
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    // flushSync ensures DOM updates synchronously before GSAP runs
    flushSync(() => setTextLines(seq));
    gsap.set(inner, { yPercent: 0 });

    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;

    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: "power4.out",
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);

    if (target) {
      propsRef.current.onMenuOpen?.();
      playOpen();
    } else {
      propsRef.current.onMenuClose?.();
      playClose();
    }

    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText]);

  // Mount: initialize GSAP + full cleanup on unmount
  useEffect(() => {
    initializeGSAP();
    return () => {
      openTlRef.current?.kill();
      closeTweenRef.current?.kill();
      spinTweenRef.current?.kill();
      textCycleAnimRef.current?.kill();
      colorTweenRef.current?.kill();
      itemEntranceTweenRef.current?.kill();
      if (gsapContextRef.current) gsapContextRef.current.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vue: watch([menuButtonColor, position]) → revert + re-init
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (gsapContextRef.current) gsapContextRef.current.revert();
    initializeGSAP();
  }, [menuButtonColor, position, initializeGSAP]);

  // Vue: watch([changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]) → sync button color
  useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = openRef.current
          ? openMenuButtonColor
          : menuButtonColor;
        gsap.set(toggleBtnRef.current, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  return (
    <div className="w-full h-full sm-scope">
      <div
        className={`staggered-menu-wrapper relative w-full h-full z-40${className ? " " + className : ""}`}
        style={
          accentColor
            ? ({ "--sm-accent": accentColor } as React.CSSProperties)
            : undefined
        }
        data-position={position}
        data-open={open || undefined}
      >
        {/* Pre-animation layers */}
        <div
          ref={preLayersRef}
          className="top-0 right-0 bottom-0 z-[5] absolute pointer-events-none sm-prelayers"
          aria-hidden="true"
        >
          {processedColors.map((color, index) => (
            <div
              key={index}
              className="top-0 right-0 absolute w-full h-full translate-x-0 sm-prelayer"
              style={{ background: color }}
            />
          ))}
        </div>

        {/* Header */}
        <header
          className="top-0 left-0 z-20 absolute flex justify-between items-center bg-transparent p-[2em] w-full pointer-events-none staggered-menu-header"
          aria-label="Main navigation header"
        >
          {logoUrl ? (
            <div
              className="flex items-center pointer-events-auto select-none sm-logo"
              aria-label="Logo"
            >
              <img
                src={logoUrl}
                alt="Logo"
                className="block w-auto h-8 object-contain sm-logo-img"
                draggable={false}
                width={110}
                height={24}
              />
            </div>
          ) : (
            <div className="sm-logo" />
          )}

          <button
            ref={toggleBtnRef}
            type="button"
            className="inline-flex relative items-center gap-[0.3rem] bg-transparent border-0 overflow-visible font-medium text-[#e9e9ef] leading-none cursor-pointer pointer-events-auto sm-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="staggered-menu-panel"
            onClick={toggleMenu}
          >
            <span
              ref={textWrapRef}
              className="inline-block relative w-[var(--sm-toggle-width,auto)] min-w-[var(--sm-toggle-width,auto)] h-[1em] overflow-hidden whitespace-nowrap sm-toggle-textWrap"
              aria-hidden="true"
            >
              <span
                ref={textInnerRef}
                className="flex flex-col leading-none sm-toggle-textInner"
              >
                {textLines.map((line, index) => (
                  <span
                    key={index}
                    className="block h-[1em] leading-none sm-toggle-line"
                  >
                    {line}
                  </span>
                ))}
              </span>
            </span>

            <span
              ref={iconRef}
              className="inline-flex relative justify-center items-center w-[14px] h-[14px] sm-icon shrink-0"
              aria-hidden="true"
            >
              <span
                ref={plusHRef}
                className="top-1/2 left-1/2 absolute bg-current rounded-[2px] w-full h-[2px] -translate-x-1/2 -translate-y-1/2 sm-icon-line"
              />
              <span
                ref={plusVRef}
                className="top-1/2 left-1/2 absolute bg-current rounded-[2px] w-full h-[2px] -translate-x-1/2 -translate-y-1/2 sm-icon-line sm-icon-line-v"
              />
            </span>
          </button>
        </header>

        {/* Slide-in panel */}
        <aside
          id="staggered-menu-panel"
          ref={panelRef}
          className="top-0 right-0 z-10 absolute flex flex-col bg-white backdrop-blur-[12px] p-[6em_2em_2em_2em] h-full overflow-y-auto staggered-menu-panel"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
          aria-hidden={!open}
        >
          <div className="flex flex-col flex-1 gap-5 sm-panel-inner">
            <ul
              className="flex flex-col m-0 p-0 list-none sm-panel-list"
              role="list"
              data-numbering={displayItemNumbering || undefined}
            >
              {items && items.length ? (
                items.map((item, idx) => (
                  <li
                    key={item.label + idx}
                    className="relative overflow-hidden leading-none sm-panel-itemWrap"
                  >
                    <a
                      className="inline-block relative sm-panel-item"
                      href={item.link}
                      aria-label={item.ariaLabel}
                      data-index={idx + 1}
                      onClick={
                        item.onClick
                          ? (e) => {
                              e.preventDefault();
                              item.onClick!();
                            }
                          : undefined
                      }
                    >
                      <span className="inline-block will-change-transform sm-panel-itemLabel">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))
              ) : (
                <li
                  className="relative overflow-hidden leading-none sm-panel-itemWrap"
                  aria-hidden="true"
                >
                  <span className="inline-block relative sm-panel-item">
                    <span className="inline-block will-change-transform sm-panel-itemLabel">
                      No items
                    </span>
                  </span>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

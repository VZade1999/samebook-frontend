import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CaretDownOutlined, CaretRightOutlined, ExclamationCircleOutlined, ShopOutlined } from "@ant-design/icons";
import { initialsOf, levelInfo, roleLabel } from "@/permissions/standing";
import type { TeamPerson } from "./teamApi";

const order = (a: TeamPerson, b: TeamPerson) => Number(b.admin) - Number(a.admin) || a.rank - b.rank || a.name.localeCompare(b.name);
const mainRole = (p: TeamPerson) => p.roles.find((r) => r.scope !== "PLATFORM");

/**
 * The company's reporting tree: the company at the top, its Admins under it,
 * then everyone by who they report to. Wide screens get a top-down chart;
 * narrow ones an indented list. People without a manager (other than Admins)
 * wait in "Not placed yet".
 */
const OrgChart: React.FC<{
  company: string;
  people: TeamPerson[];
  onOpen: (p: TeamPerson) => void;
  highlight?: number | null;
}> = ({ company, people, onOpen, highlight }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [closed, setClosed] = useState<Set<number>>(new Set());

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setNarrow(el.clientWidth < 720);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { tops, unplaced, kids } = useMemo(() => {
    const active = people.filter((p) => p.is_active);
    const ids = new Set(active.map((p) => p.id));
    const kids = new Map<number, TeamPerson[]>();
    const tops: TeamPerson[] = [];
    const unplaced: TeamPerson[] = [];
    active.forEach((p) => {
      if (p.reports_to != null && ids.has(p.reports_to) && p.reports_to !== p.id) {
        kids.set(p.reports_to, [...(kids.get(p.reports_to) || []), p]);
      } else if (p.admin || p.platform) {
        tops.push(p);
      } else {
        unplaced.push(p);
      }
    });
    // People with their own team but no manager are leaders too: keep them in the chart.
    const leaders = unplaced.filter((p) => kids.has(p.id));
    kids.forEach((list) => list.sort(order));
    return {
      tops: [...tops, ...leaders].sort(order),
      unplaced: unplaced.filter((p) => !kids.has(p.id)).sort(order),
      kids,
    };
  }, [people]);

  const toggle = (id: number) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const Node: React.FC<{ p: TeamPerson }> = ({ p }) => {
    const r = mainRole(p);
    const tone = levelInfo(p.admin ? 1 : p.rank).tone;
    const children = kids.get(p.id) || [];
    const open = !closed.has(p.id);
    return (
      <div className={`tm-node${highlight === p.id ? " hl" : ""}`} style={{ ["--tone" as any]: tone }}>
        <button type="button" className="tm-node-main" onClick={() => onOpen(p)} aria-label={`${p.name}, ${p.designation || roleLabel(r?.name) || ""}`}>
          <span className="tm-avatar" style={{ ["--tone" as any]: tone }}>
            {initialsOf(p.name)}
          </span>
          <span className="tm-node-text">
            <b>
              {p.name}
              {p.is_me && <em className="tm-you">You</em>}
            </b>
            <span>{p.designation || p.department || p.email}</span>
            <span className="tm-node-roles">
              {p.platform && <span className="tm-chip platform">SameBook</span>}
              {r && (
                <span className="tm-chip" style={{ ["--tone" as any]: levelInfo(r.level).tone }}>
                  <i /> {roleLabel(r.name)}
                </span>
              )}
            </span>
          </span>
        </button>
        {children.length > 0 && (
          <button
            type="button"
            className="tm-node-toggle"
            onClick={() => toggle(p.id)}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${p.first_name || p.name}'s team`}
          >
            {open ? <CaretDownOutlined /> : <CaretRightOutlined />} {p.team_size || children.length}
          </button>
        )}
      </div>
    );
  };

  const branch = (p: TeamPerson): React.ReactNode => {
    const children = kids.get(p.id) || [];
    return (
      <li key={p.id}>
        <Node p={p} />
        {children.length > 0 && !closed.has(p.id) && <ul>{children.map(branch)}</ul>}
      </li>
    );
  };

  return (
    <div className={`tm-org-wrap${narrow ? " narrow" : ""}`} ref={wrap}>
      <div className="tm-org-scroll">
        <div className={`tm-org${narrow ? " list" : ""}`}>
          <ul>
            <li>
              <div className="tm-node company">
                <span className="tm-node-main as-label">
                  <span className="tm-avatar company">
                    <ShopOutlined />
                  </span>
                  <span className="tm-node-text">
                    <b>{company}</b>
                    <span>
                      {people.filter((p) => p.is_active).length} people · {tops.length} at the top
                    </span>
                  </span>
                </span>
              </div>
              {tops.length > 0 && <ul>{tops.map(branch)}</ul>}
            </li>
          </ul>
        </div>
      </div>
      {unplaced.length > 0 && (
        <div className="tm-unplaced">
          <div className="tm-unplaced-h">
            <ExclamationCircleOutlined /> Not placed yet <em>— set who they report to, and they join the chart</em>
          </div>
          <div className="tm-unplaced-list">
            {unplaced.map((p) => (
              <Node key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChart;

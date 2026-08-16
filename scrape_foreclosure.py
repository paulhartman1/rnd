#!/usr/bin/env python3
"""
Adams County Foreclosure Scraper
Scrapes https://apps.adcogov.org/PTForeclosureSearch/
"""

import re
import time
import csv
import argparse
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://apps.adcogov.org/PTForeclosureSearch/"


@dataclass
class ForeclosureRecord:
    fc_number: str
    grantor: str
    street: str
    zip_code: str
    subdivision: str
    balance_due: str
    sale_date: str
    status: str
    detail_url: str


class ForeclosureScraper:
    def __init__(self, delay: float = 1.5, timeout: int = 30):
        self.delay = delay
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })
        self.viewstate = ""
        self.eventvalidation = ""
        self.viewstategenerator = ""

    def _get_hidden_inputs(self, soup: BeautifulSoup) -> dict:
        """Extract ASP.NET hidden form fields."""
        data = {}
        for field in ["__VIEWSTATE", "__EVENTVALIDATION", "__VIEWSTATEGENERATOR"]:
            el = soup.find("input", {"id": field})
            if el and el.get("value"):
                data[field] = el["value"]
        return data

    def _update_tokens(self, soup: BeautifulSoup):
        """Update internal token state from response."""
        tokens = self._get_hidden_inputs(soup)
        self.viewstate = tokens.get("__VIEWSTATE", "")
        self.eventvalidation = tokens.get("__EVENTVALIDATION", "")
        self.viewstategenerator = tokens.get("__VIEWSTATEGENERATOR", "")

    def initial_load(self) -> BeautifulSoup:
        """Load initial page and capture tokens."""
        resp = self.session.get(BASE_URL, timeout=self.timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        self._update_tokens(soup)
        return soup

    def post_show_all(self, retries: int = 3) -> BeautifulSoup:
        """Submit 'Show All' button to get first results page."""
        data = {
            "__EVENTTARGET": "",
            "__EVENTARGUMENT": "",
            "__VIEWSTATE": self.viewstate,
            "__EVENTVALIDATION": self.eventvalidation,
            "__VIEWSTATEGENERATOR": self.viewstategenerator,
            "ctl00$ctl00$MainContent$CustomContentPlaceHolder$btnShowAll": "Show All",
        }
        for attempt in range(retries):
            try:
                resp = self.session.post(BASE_URL, data=data, timeout=self.timeout)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                self._update_tokens(soup)
                return soup
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f"  Timeout on Show All, retrying in {wait}s... (attempt {attempt + 1}/{retries})")
                    time.sleep(wait)
                else:
                    raise
            except requests.exceptions.RequestException:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f"  Error on Show All, retrying in {wait}s... (attempt {attempt + 1}/{retries})")
                    time.sleep(wait)
                else:
                    raise

    def post_search(self, params: dict[str, str]) -> BeautifulSoup:
        """Submit search with custom parameters.

        Accepts a dict where keys are form field names without the
        ctl00$ctl00$MainContent$CustomContentPlaceHolder$ prefix.
        The method prepends the full path and submits via POST, then
        updates internal tokens.
        """
        data: dict[str, str] = {
            "__EVENTTARGET": "",
            "__EVENTARGUMENT": "",
            "__VIEWSTATE": self.viewstate,
            "__EVENTVALIDATION": self.eventvalidation,
            "__VIEWSTATEGENERATOR": self.viewstategenerator,
        }
        for key, value in params.items():
            full_key = f"ctl00$ctl00$MainContent$CustomContentPlaceHolder${key}"
            data[full_key] = value

        resp = self.session.post(BASE_URL, data=data, timeout=self.timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        self._update_tokens(soup)
        return soup

    def post_pagination(self, event_target: str, retries: int = 3) -> BeautifulSoup:
        """Submit pagination postback with retries."""
        data = {
            "__EVENTTARGET": event_target,
            "__EVENTARGUMENT": "",
            "__VIEWSTATE": self.viewstate,
            "__EVENTVALIDATION": self.eventvalidation,
            "__VIEWSTATEGENERATOR": self.viewstategenerator,
        }
        for attempt in range(retries):
            try:
                resp = self.session.post(BASE_URL, data=data, timeout=self.timeout)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                self._update_tokens(soup)
                return soup
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f"  Timeout, retrying in {wait}s... (attempt {attempt + 1}/{retries})")
                    time.sleep(wait)
                else:
                    raise
            except requests.exceptions.RequestException:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f"  Error, retrying in {wait}s... (attempt {attempt + 1}/{retries})")
                    time.sleep(wait)
                else:
                    raise

    def parse_results_table(self, soup: BeautifulSoup) -> list[ForeclosureRecord]:
        """Parse the results gridview table."""
        records = []
        table = soup.find("table", {"id": re.compile(r"gvSearchResults$")})
        if not table:
            return records

        for row in table.find_all("tr", class_=re.compile(r"row")):
            cells = row.find_all("td")
            if len(cells) < 8:
                continue

            link = cells[0].find("a")
            fc_number = link.get_text(strip=True) if link else cells[0].get_text(strip=True)
            detail_url = ""
            if link and link.get("href"):
                href = link["href"]
                match = re.search(r"__doPostBack\('([^']+)',''\)", href)
                if match:
                    detail_url = match.group(1)

            records.append(ForeclosureRecord(
                fc_number=fc_number,
                grantor=cells[1].get_text(strip=True),
                street=cells[2].get_text(strip=True),
                zip_code=cells[3].get_text(strip=True),
                subdivision=cells[4].get_text(strip=True),
                balance_due=cells[5].get_text(strip=True),
                sale_date=cells[6].get_text(strip=True),
                status=cells[7].get_text(strip=True),
                detail_url=detail_url,
            ))
        return records

    def get_pagination_targets(self, soup: BeautifulSoup) -> dict[int, str]:
        """Extract pagination targets mapped by page number using aria-label."""
        targets = {}
        for pager_id in ["TopPager", "BottomPager"]:
            nav = soup.find("nav", {"id": re.compile(f".*{pager_id}Nav$")})
            if nav:
                for link in nav.find_all("a", href=True):
                    href = link["href"]
                    match = re.search(r"__doPostBack\('([^']+)',''\)", href)
                    if not match:
                        continue
                    target = match.group(1)
                    label = link.get("aria-label", "") or link.get_text(strip=True)
                    page_match = re.search(r"page (\d+)", label, re.I)
                    if page_match:
                        page_num = int(page_match.group(1))
                        targets[page_num] = target
                    elif "FirstPage" in target or "First Page" in label:
                        targets[1] = target
                    elif "LastPage" in target or "Last Page" in label:
                        targets[-1] = target

        return targets

    def get_total_pages(self, soup: BeautifulSoup) -> int:
        """Extract total page count from pager by clicking Last Page."""
        targets = self.get_pagination_targets(soup)
        last_page_target = targets.get(-1)

        if last_page_target:
            print("  Fetching last page to determine total...")
            time.sleep(self.delay)
            last_soup = self.post_pagination(last_page_target)
            last_targets = self.get_pagination_targets(last_soup)
            max_page = max(last_targets.keys()) if last_targets else 1
            return max_page

        # Fallback: check visible pages
        max_page = max(targets.keys()) if targets else 1
        return max_page

    def scrape(self, max_pages: Optional[int] = None, resume_from: int = 1, output_path: Optional[Path] = None) -> list[ForeclosureRecord]:
        """Main scraping loop."""
        all_records = []

        print("Loading initial page...")
        self.initial_load()

        print("Submitting 'Show All'...")
        soup = self.post_show_all()

        total_records_text = soup.find("span", {"id": re.compile(r"SearchResultsLabel$")})
        if total_records_text:
            print(f"Total records: {total_records_text.get_text(strip=True)}")

        # Get total pages by fetching last page, then restart from page 1
        total_pages = self.get_total_pages(soup)
        print(f"Total pages detected: {total_pages}")

        # Restart from page 1 after getting total
        print("Restarting from page 1...")
        self.initial_load()
        soup = self.post_show_all()

        if max_pages:
            total_pages = min(total_pages, max_pages)

        page = 1
        # Navigate to resume_from page
        if resume_from > 1:
            print(f"Navigating to page {resume_from}...")
            for p in range(1, resume_from):
                targets = self.get_pagination_targets(soup)
                next_target = targets.get(p + 1)
                if not next_target:
                    print(f"  Cannot navigate to page {p + 1}, stopping.")
                    return all_records
                time.sleep(self.delay)
                soup = self.post_pagination(next_target)

        while page <= total_pages:
            if page < resume_from:
                page += 1
                continue

            print(f"Scraping page {page}/{total_pages}...")
            records = self.parse_results_table(soup)
            all_records.extend(records)
            print(f"  Found {len(records)} records (total: {len(all_records)})")

            # Save progress every 50 pages
            if page % 50 == 0:
                self.save_incremental(all_records, output_path, page)

            if page >= total_pages:
                break

            targets = self.get_pagination_targets(soup)
            next_target = targets.get(page + 1)

            if not next_target:
                print("  No pagination target found, stopping.")
                break

            time.sleep(self.delay)
            soup = self.post_pagination(next_target)
            page += 1

        return all_records

    def save_csv(self, records: list[ForeclosureRecord], filepath: Path):
        """Save records to CSV."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(asdict(records[0]).keys()) if records else [])
            writer.writeheader()
            for r in records:
                writer.writerow(asdict(r))
        print(f"Saved {len(records)} records to {filepath}")

    def save_incremental(self, records: list[ForeclosureRecord], filepath: Path, page: int):
        """Save incremental progress."""
        inc_path = filepath.with_suffix(f".page{page}.csv")
        self.save_csv(records, inc_path)


def main():
    parser = argparse.ArgumentParser(description="Scrape Adams County Foreclosure Search")
    parser.add_argument("-o", "--output", default="foreclosures.csv", help="Output CSV file")
    parser.add_argument("--max-pages", type=int, help="Limit pages to scrape (for testing)")
    parser.add_argument("--resume", type=int, default=1, help="Resume from page number")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests (seconds)")
    args = parser.parse_args()

    scraper = ForeclosureScraper(delay=args.delay)
    records = scraper.scrape(max_pages=args.max_pages, resume_from=args.resume, output_path=Path(args.output))
    scraper.save_csv(records, Path(args.output))


if __name__ == "__main__":
    main()
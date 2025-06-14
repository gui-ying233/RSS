"use strict";
const {
	env: { GREASYFORK_ID },
} = require("process");
const { writeFileSync } = require("fs");
const jsdom = require("jsdom");
const RSS = require("rss");
const feed = new RSS({
	title: "Greasy Fork 反馈",
	site_url: "https://greasyfork.org",
	image_url: "https://greasyfork.org/vite/assets/blacklogo16-DftkYuVe.png",
	language: "zh-CN",
	ttl: 5,
});
(async () => {
	(
		await Promise.all(
			(
				await Promise.all(
					[
						...new jsdom.JSDOM(
							await fetch(
								`https://greasyfork.org/users/${GREASYFORK_ID}`
							).then(r => r.text())
						).window.document
							.getElementById("user-script-list")
							.getElementsByTagName("li"),
					]
						.map(e => e.dataset.scriptId)
						.map(async id =>
							[
								...new jsdom.JSDOM(
									await fetch(
										`https://greasyfork.org/scripts/${id}/feedback`
									).then(r => r.text())
								).window.document.body.querySelectorAll(
									".script-discussion-list a.discussion-title"
								),
							].map(e => `https://greasyfork.org${e.href}`)
						)
				)
			)
				.flat()
				.map(async url =>
					[
						...new jsdom.JSDOM(
							await fetch(url).then(r => r.text())
						).window.document.body.getElementsByClassName(
							"comment"
						),
					].map(c => {
						const author =
							c.getElementsByClassName("user-link")[0]
								.textContent;
						return feed.item({
							title: `来自 ${author} 的新留言`,
							description: c
								.getElementsByClassName("user-content")[0]
								.textContent.trim(),
							url: url,
							author,
							date: c.getElementsByTagName("relative-time")[0]
								.datetime,
						});
					})
				)
		)
	).length && writeFileSync("feeds/greasyfork.xml", feed.xml());
})();

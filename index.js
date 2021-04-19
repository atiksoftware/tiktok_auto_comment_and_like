// const puppeteer = require('puppeteer');
// Used puppeteer extra for stealth
const puppeteer = require('puppeteer-extra')
const fs = require('fs').promises; 
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin()); 
const colors = require('colors');
const _ = require('lodash');
const {installMouseHelper} = require('./install-mouse-helper');

const cliProgress = require('cli-progress');


/**
 * Used firefox extension
 * https://addons.mozilla.org/tr/firefox/addon/a-cookie-manager/
 * for export cookies as JSON
 */



// load json as array
const loadJson = async (file) => {
	const data = await fs.readFile(file)
	return JSON.parse(data)
}
// save object as json
const saveJson = async (file,data) => {
	return await fs.writeFile(file,JSON.stringify(data, null, 4))
} 
// wait for a while 
const delay = (time) => {
	return new Promise(function(resolve) { setTimeout(resolve, time);});
}
// wait for a while with progress bar
const waitfor = async (min,max) => {
	let t = _.random(min * 1000,max * 1000);

	const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
	bar.start(parseInt(t/100), 0);
	for(let i = 0; i < t; i+=100){
		bar.increment(); 
		await delay(100)
	}
	bar.stop(); 
}
 
const genereateNewComment = () => {
	const list = ['😀','🙄','👍','✌️','💪','🧐','🤔','👧','🤨','👋','🤚','🖐','✋','🖖','👌','👋🏻','🤚🏻','🖐🏻','✋🏻','🖖🏻','👌🏻','lol','fyp','yes','up','get','low','ilginç']
	return _.sample(list)
}

(async () => {
	const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
    ]; 
    const options = {
        args,
        headless: false,
        ignoreHTTPSErrors: true,
        userDataDir: './profile_n'
    };
  
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage(); 

	// load cookies from JSON
	const cookies = await loadJson('./cookies.json')
	await page.setCookie(...cookies);

	// add mouse helper circle for DEBUG
	await installMouseHelper(page); 

	// save cookies after page loaded
	page.on('load', async () => { 
		await saveJson('./cookies.json', await page.cookies() ); 
	})



	// goto home page
	const gotoHomePage = async () => {
		return page.goto('https://www.tiktok.com/?lang=tr-TR&is_copy_url=1&is_from_webapp=v1');
	}
	// find a dom element's absolute position on page
	const findPosition = async(query_string) => {
		return await page.evaluate((query_string) => { 
			const cumulativeOffset = (element) => { var top = 0, left = 0; do { top += element.offsetTop  || 0; left += element.offsetLeft || 0; element = element.offsetParent; } while(element); return { top: top, left: left }; };
			return cumulativeOffset(document.querySelector(query_string))
		},query_string);
	}
	// click to position
	const mouseClick = async (x,y) => {
		await page.mouse.move(x, y);
		await delay(_.random(10,100))
		await page.mouse.down();
		await delay(_.random(10,100))
		await page.mouse.up();
	}
 
 

	for(let k = 0; k < 10000;k++){ 

		// Load Home page
		console.log("LOADING HOME PAGE".yellow) 
		await gotoHomePage(); 

		// wait a few seconds for wait load contents
		await waitfor(2,5)  
 
		// Get entity coun on home page
		let post_count = await page.evaluate(() => {
			return document.querySelectorAll('.lazyload-wrapper').length
		}) 
		console.log("Post Count: ".yellow + post_count.toString().yellow)

		// wait a few seconds for relax
		await waitfor(2,5) 
		for(let p = 0; 0 < post_count; p++){
			// working on N. entity
			console.log("POST ".green + p.toString().green)

			// Click comment button for open comment dialog.
			console.log(" - clicked comment dialog".cyan)
			await page.evaluate((p) => {
				document.querySelectorAll('.lazyload-wrapper')[p].querySelectorAll('.item-action-bar .bar-item-wrapper')[1].click() 
			},p);
			console.log(" - comment dialog opened".cyan)
 
			// wait a few seconds until dialog opens
			await waitfor(2,5)  
 
			// add a random comment to video. For more interaction
			console.log(" - Adding my comment".cyan)
			// get comment input box position
			let input_position = await findPosition('.public-DraftEditor-content'); 
			// focus to input box
			await mouseClick(input_position.left + 15, input_position.top + 10);

			// get sample comment in comment list
			const myComment = genereateNewComment();
			// type/fill comment to inbox
			await page.keyboard.type(myComment);
			// press Enter for submit comment
			await page.keyboard.type(String.fromCharCode(13));
			console.log(" - posted my comment".cyan)

			// wait a few seconds until sobmit completed
			await waitfor(5,10) 

			// get video comments list
			console.log(" - getting comment list".cyan)
			let comments = await page.evaluate(() => {
				let comments = []
				document.querySelectorAll('.video-infos-container .comment-container .comments .comment-item').forEach(e => {
					comments.push({
						name : e.querySelector('.username').innerText,
						text : e.querySelector('.comment-text > span').innerText,
						count : e.querySelector('.like-container .count').innerText,
					}) 
				})
				return comments
			})
			console.log(" - founded ".yellow + comments.length.toString().yellow + " comment")

			// begin like comments step by step
			for(let c = 0; c < comments.length; c++){
				let comment = comments[c];
				console.log(" - COMMENT ".gray + c.toString().yellow + " ||> ".gray + comment.name.gray  + " : " + comment.count.toString().gray  + " : " + comment.text.grey)
				// like N. comment
				await page.evaluate((c) => {
					document.querySelectorAll('.video-infos-container .comment-container .comments .comment-item')[c].querySelector('.like-container img').click()
				},c);
				console.log(" - liked".magenta)
				// wait a few seconds before moving on to the next comment
				await waitfor(3,6)
			}
			// 20 comment liked
			console.log("post completed".green)

			// Click to close button at top-left for close dialog
			await page.evaluate(() => {
				document.querySelector('.video-card-container > .control-icon.close').click()
			});

			console.log("dialog closed".cyan)

			// wait a few seconds before moving on to the next video
			await waitfor(15,60)
	
		}

		
	}

 

})();
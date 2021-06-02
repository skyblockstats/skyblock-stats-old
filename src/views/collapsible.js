const scrollToHash = () => {
	// get the url hash
	const hash = location.hash.slice(1)
	// get the element with that hash
	const selectedEl = document.getElementById(hash)
	if (selectedEl) {
		// uncollapse the element
		selectedEl.getElementsByClassName('collapsePart')[0].classList.remove('collapsed')
		// scroll to the element with the hash
		selectedEl.scrollIntoView()
	}
}
document.addEventListener('DOMContentLoaded', () => {
	for (const sectionEl of document.getElementsByClassName('collapsible')) {
		var collapsibleTitle = sectionEl.getElementsByTagName('h2')[0]
		if (!collapsibleTitle)
			// if the element doesn't exist, try getting it with h3 instead of h2
			collapsibleTitle = sectionEl.getElementsByTagName('h3')[0]

		const name = collapsibleTitle.innerText
		const hashLink = sectionEl.id
		collapsibleTitle.classList.add('sectionTitle')
		sectionEl.classList.add('section')

		if (!sectionEl.classList.contains('noCollapse')) {
			const collapsiblePartEl = document.createElement('div')
			collapsiblePartEl.classList.add('collapsePart')
			collapsiblePartEl.classList.add('collapsed')
			collapseArrowEl = document.createElement('div')
			collapseArrowEl.classList.add('collapseArrow')
			collapseArrowEl
			collapsiblePartEl.appendChild(collapseArrowEl)
			collapsiblePartEl.appendChild(collapsibleTitle)
			sectionEl.prepend(collapsiblePartEl)
			console.log('ok')
			collapsiblePartEl.addEventListener('click', (e) => {
				console.log('collapsiblePartEl clicked', collapsiblePartEl)
				collapsiblePartEl.classList.toggle('collapsed')
			})
		}
	}
	scrollToHash()
})
addEventListener('hashchange', scrollToHash)

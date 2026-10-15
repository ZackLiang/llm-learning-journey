const button = document.querySelector('#theme');
if (localStorage.getItem('llm-theme') === 'dark') document.body.classList.add('dark');
button?.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('llm-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });

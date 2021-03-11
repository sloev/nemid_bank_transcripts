# Scrape your bank transactions to stdout jsonlines (with NemId)

<a href="https://www.buymeacoffee.com/sloev" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-pink.png" alt="Buy Me A Coffee" height="51px" width="217px"></a>

> :warning: **always read the code before running, this is afterall given your nemid!**

## How it works

![diagram](/metadata/diagram.png)


`scrape.js` logs into your netbank using NemId credentials, it will click "send auth request" which will prompt your NemId app to let you authenticate.

It will then go to your transactions and scroll down while intercepting all HTTP requests made to a certain path containing your transaction history. After scrolling for a bit it will go back to the top and start from scratch scrolling again.

It will continue to do so until it gets logged out where it again will prompt the users Nemid app to authorize that it logs in again and starts polling transaction records.

> :warning: In theory it should work with most danish banks using "Bankernes EDB Central" according to [this issue](https://github.com/bank2ynab/bank2ynab/issues/219)

## Usage

install `nodejs>=15.3` *[get nodejs](https://nodejs.org/en/)*

```bash
$ npm install .
```

> *Example based on using Fælleskassen*

```bash
$ NETBANK_URL=https://netbank.faelleskassen.dk \
  NEM_USERNAME=something \
  NEM_PASSWORD=darkly \
  node scrape.js >> stream.jsonl
```

and `stream.jsonl` will contain something like:

```json
...
{"amount":-23,"balance":3413.27,"description":"Kontaktløs something","timestamp":"2016-10-02T04:43:26.348622+01:00","id":"BR-adsfsdafdfdasdfas"}
{"amount":543,"balance":23.27,"description":"gamle varer something","timestamp":"2017-10-02T04:43:26.348622+01:00","id":"BR-asdfasfvasghsghsd"}
...
```

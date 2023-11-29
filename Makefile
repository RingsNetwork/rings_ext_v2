install:
	yarn cache clean
	yarn install
lint:
	pnpm eslint ./src/*/*.ts --fix

dev:
	pnpm dev

build:
	pnpm build

fmt:
	npx eslint --fix --ext .tsx ./src

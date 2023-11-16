install:
	yarn cache clean
	yarn install
lint:
	pnpm eslint ./src/*/*.ts --fix

dev:
	pnpm dev
fmt:
	npx eslint --fix --ext .tsx ./src

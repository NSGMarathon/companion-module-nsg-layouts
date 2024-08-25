# companion-module-nsg-layouts

[Bitfocus Companion](https://bitfocus.io/companion) module to control [nsg2-layouts](https://github.com/NSGMarathon/nsg2-layouts).

Tested with NodeCG 2.2.2

## Usage

- Clone this repository to a new directory
  - Your directory structure should look like this:
    ```
    └─┬ /companion-modules <- developer modules path
      └─┬ /companion-modules/companion-module-nsg-layouts
        ├── /companion-modules/companion-module-nsg-layouts/src
        ├── /companion-modules/companion-module-nsg-layouts/companion
        └── ...
    ```
- Set the new directory as Companion's developer modules path ([Guide](https://github.com/bitfocus/companion-module-base/wiki#5-launch-and-setup-companion))
- Install dependencies for this module (`yarn`)
- Build the module (`yarn build:main`)

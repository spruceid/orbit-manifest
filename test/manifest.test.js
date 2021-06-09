const Manifest = artifacts.require("Manifest");

contract('Manifest', () => {
  let counterInstance;
  let storage;

  before(async() => {
    manifestInstance = await Manifest.deployed();
    storage = await manifestInstance.storage();
    assert.equal(storage, { admins: [], hosts: [] }, "Storage was not initialized empty.")
  });

  it("...should add an admin to storage.", async() => {
    await manifestInstance.addAdmin([]);
    storage = await manifestInstance.storage();
    assert.equal(storage, { admins: [], hosts: [] }, "Storage was not changed.");
  });
  
  it("...should remove an admin from storage.", async() => {
    await manifestInstance.removeAdmint([]);
    storage = await manifestInstance.storage();
    assert.equal(storage, { admins: [], hosts: [] }, "Storage was not changed.");
  });
});

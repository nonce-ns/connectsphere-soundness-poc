root@vmi2640956:~# walrus store \
  --context mainnet \
  /root/proof.bin \
  --epochs 1 \
  --deletable
2025-10-03T19:04:32.210042Z  INFO walrus: client version: 1.34.0-6cf292509809
2025-10-03T19:04:32.210495Z  INFO walrus_sdk::config: using Walrus configuration from '/root/.config/walrus/client_config.yaml' with 'mainnet' context
2025-10-03T19:04:32.212406Z  INFO walrus_sui::config: using Sui wallet configuration from '/root/.sui/sui_config/client.yaml'
2025-10-03T19:04:32.826810Z  INFO walrus_service::client::cli::runner: storing 1 files as blobs on Walrus
 • encoding the blob [00:00:01]                                                                                                                                                                       2025-10-03T19:04:34.174963Z  INFO reserve_and_store_blobs_retry_committees_with_path:encode_blobs{count=1}:encode_blobs__par_iter:encode_pairs_and_metadata: walrus_sdk::client: encoded sliver pairs and metadata symbol_size=142 primary_sliver_size=94714 secondary_sliver_size=47428 duration=1.322003065s
 ◉ blob encoded; blob ID: j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc [00:00:01]                                                                                                                      2025-10-03T19:04:34.175263Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: storing 1 sliver pairs with metadata
2025-10-03T19:04:34.637289Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: retrieved 1 blob statuses duration=462.003246ms
2025-10-03T19:04:34.637383Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client::resource: num_blobs=1 num_to_be_processed=1
2025-10-03T19:04:35.925826Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: 1 blob resources obtained
Some(RegisterNew { blob: Blob { id: 0xe58c8b2e20c09fcbb1bff8e16d8c19ef943b12d4b6d700d9fe263a5400cbfacf, registered_epoch: 14, blob_id: BlobId(j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc), size: 31313911, encoding_type: RS2, certified_epoch: None, storage: StorageResource { id: 0xc42d0f21b668cba6fa11f9439172aa22b5f1230250bf6b32b2ffc0bf2224240a, start_epoch: 14, end_epoch: 15, storage_size: 206174000 }, deletable: true }, operation: RegisterFromScratch { encoded_length: 206174000, epochs_ahead: 1 } }) duration=1.288437109s
2025-10-03T19:04:36.127736Z  INFO reserve_and_store_blobs_retry_committees_with_path:send_blob_data_and_get_certificate: walrus_sdk::client: starting to send data to storage nodes blob_id=j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc
 ◉ sending slivers (j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc) [00:00:00] [-------------------------------------------------------------------------------------------------------------] 0/667 (0s)
 ◉ slivers sent (j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc) [00:00:08] [##############################################################################################################] 667/667 (0s)
 ◉ slivers sent (j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc) [00:00:08] [##############################################################################################################] 667/667 (0s)
 ◉ additional slivers stored (j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc) [00:00:04]                                                                                                                 2025-10-03T19:04:49.576906Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: finished sending blob data and collecting certificate blob_id=j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc duration=13.449171319s blob_size=31313911
2025-10-03T19:04:49.576970Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: get 1 blobs certificates duration=13.650829942s
2025-10-03T19:04:53.081113Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: certified 1 blobs on Sui duration=3.504062129s
2025-10-03T19:04:53.082068Z  INFO walrus_service::client::cli::runner: 1 out of 1 blobs stored duration=20.255207847s
Success: Deletable blob stored successfully.
Path: /root/proof.bin
Blob ID: j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc
Sui object ID: 0xe58c8b2e20c09fcbb1bff8e16d8c19ef943b12d4b6d700d9fe263a5400cbfacf
Unencoded size: 29.9 MiB
Encoded size (including replicated metadata): 197 MiB
Cost (excluding gas): 0.0061 WAL (storage was purchased, and a new blob object was registered) 
Expiry epoch (exclusive): 15
Encoding type: RedStuff/Reed-Solomon

Summary for Modified or Created Blobs (1 newly certified)
Total encoded size: 197 MiB
Total cost: 0.0061 WAL

-----------------

root@vmi2640956:~# walrus store   --context mainnet   /root/connectsphere-sp1-program.elf   --epochs 5   --deletable
2025-10-03T19:07:01.248869Z  INFO walrus: client version: 1.34.0-6cf292509809
2025-10-03T19:07:01.249509Z  INFO walrus_sdk::config: using Walrus configuration from '/root/.config/walrus/client_config.yaml' with 'mainnet' context
2025-10-03T19:07:01.249551Z  INFO walrus_sui::config: using Sui wallet configuration from '/root/.sui/sui_config/client.yaml'
2025-10-03T19:07:01.708440Z  INFO walrus_service::client::cli::runner: storing 1 files as blobs on Walrus
 ◎ encoding the blob [00:00:00]                                                                                                                                                                       2025-10-03T19:07:02.544609Z  INFO reserve_and_store_blobs_retry_committees_with_path:encode_blobs{count=1}:encode_blobs__par_iter:encode_pairs_and_metadata: walrus_sdk::client: encoded sliver pairs and metadata symbol_size=4 primary_sliver_size=2668 secondary_sliver_size=1336 duration=834.848196ms
 ◉ blob encoded; blob ID: MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ [00:00:00]                                                                                                                      2025-10-03T19:07:02.544959Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: storing 1 sliver pairs with metadata
2025-10-03T19:07:03.003887Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: retrieved 1 blob statuses duration=458.898089ms
2025-10-03T19:07:03.003955Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client::resource: num_blobs=1 num_to_be_processed=1
2025-10-03T19:07:06.372544Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: 1 blob resources obtained
Some(RegisterNew { blob: Blob { id: 0x38b068f844ff1183e94df8b3fe1ea8dd7172f03612815939502857bf5e7692d5, registered_epoch: 14, blob_id: BlobId(MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ), size: 640000, encoding_type: RS2, certified_epoch: None, storage: StorageResource { id: 0x6150216cf6bc48f0bc114969f98e605488afb5abe92fe533ef81b84564f591bb, start_epoch: 14, end_epoch: 19, storage_size: 68036000 }, deletable: true }, operation: RegisterFromScratch { encoded_length: 68036000, epochs_ahead: 5 } }) duration=3.368576263s
2025-10-03T19:07:06.573419Z  INFO reserve_and_store_blobs_retry_committees_with_path:send_blob_data_and_get_certificate: walrus_sdk::client: starting to send data to storage nodes blob_id=MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ
 • sending slivers (MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ) [00:00:00] [-------------------------------------------------------------------------------------------------------------] 0/667 (0s)
 ◉ slivers sent (MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ) [00:00:01] [##############################################################################################################] 667/667 (0s)
 ◉ slivers sent (MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ) [00:00:01] [##############################################################################################################] 667/667 (0s)
 ◉ additional slivers stored (MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ) [00:00:01]                                                                                                                 2025-10-03T19:07:09.101370Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: finished sending blob data and collecting certificate blob_id=MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ duration=2.527963585s blob_size=640000
2025-10-03T19:07:09.101414Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: get 1 blobs certificates duration=2.728650061s
2025-10-03T19:07:12.061747Z  INFO reserve_and_store_blobs_retry_committees_with_path: walrus_sdk::client: certified 1 blobs on Sui duration=2.960288791s
2025-10-03T19:07:12.062739Z  INFO walrus_service::client::cli::runner: 1 out of 1 blobs stored duration=10.354251338s
Success: Deletable blob stored successfully.
Path: /root/connectsphere-sp1-program.elf
Blob ID: MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ
Sui object ID: 0x38b068f844ff1183e94df8b3fe1ea8dd7172f03612815939502857bf5e7692d5
Unencoded size: 625 KiB
Encoded size (including replicated metadata): 64.9 MiB
Cost (excluding gas): 0.0049 WAL (storage was purchased, and a new blob object was registered) 
Expiry epoch (exclusive): 19
Encoding type: RedStuff/Reed-Solomon

Summary for Modified or Created Blobs (1 newly certified)
Total encoded size: 64.9 MiB
Total cost: 0.0049 WAL

-----------------

root@vmi2640956:~# soundness-cli send \                                                                             
  --proof-file "j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc" \
  --elf-file "MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ" \
  --key-name "NS" \
  --proving-system "sp1"
🔍 Analyzing inputs...
📁 Proof: Detected as Walrus Blob ID: j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc
📁 ELF Program: Detected as Walrus Blob ID: MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ
  📂 Inputs processed successfully                                                                                                                                                                    Enter password to decrypt the secret key: 
  ✍️  Payload signed successfully                                                                                                                                                                     ⠁
  🚀 Request sent successfully                                                                                                                                                                        
❌ Error: Server returned status 502 Bad Gateway
Error details: error code: 502

-----------------

root@vmi2640956:~# soundness-cli send   --proof-file "j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc"   --elf-file "MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ"   --key-name "NS"   --proving-system "sp1"
🔍 Analyzing inputs...
📁 Proof: Detected as Walrus Blob ID: j9bZ3Deg0CKtnjNLaCdkyLy_FzJjOP5fk6ysAoLojdc
📁 ELF Program: Detected as Walrus Blob ID: MExTNCeUcJGjfoxWTTlOTLK0EasWkFvJ382dpxLcESQ
  📂 Inputs processed successfully                                                                                                                                                                    Enter password to decrypt the secret key: 
  ✍️  Payload signed successfully                                                                                                                                                                     ⠁
  🚀 Request sent successfully                                                                                                                                                                        
❌ Error: Server returned status 502 Bad Gateway
Error details: error code: 502

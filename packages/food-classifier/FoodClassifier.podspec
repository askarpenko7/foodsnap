require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "FoodClassifier"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => ".git", :tag => "#{s.version}" }
  # The Vision implementation is Swift, bridged to the ObjC codegen spec through
  # the CocoaPods-generated FoodClassifier-Swift.h. A pod with Swift sources has
  # to declare its language version or CocoaPods refuses to integrate it.
  s.swift_version = "5.0"

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"

  install_modules_dependencies(s)
end

require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = package['name']
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.source         = { :git => package['repository']['url'], :tag => s.version }

  s.requires_arc   = true
  s.platform       = :ios, '12.0'

  s.source_files   = 'ios/**/*.{h,m,swift}'
  s.swift_version  = '5.0'

  s.dependency 'React-Core'
  # BBPSSDK is consumed via git URL in the app's Podfile
  # s.dependency 'BBPSSDK'
end
